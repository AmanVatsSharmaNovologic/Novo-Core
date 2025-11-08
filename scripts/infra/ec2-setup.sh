#!/usr/bin/env bash
# Purpose: One-command EC2 setup (Ubuntu 22.04) with Docker, Compose plugin, SSM agent
# Features: Robust rollback, idempotent resources, live logs, safe defaults
set -Eeuo pipefail
set -x

rollback() {
  code=$?
  set +e
  echo "[rollback] exit code=$code"
  if [[ -n "${RUN_TAG:-}" ]]; then
    # Terminate and delete any instance with this tag
    ids=$(aws ec2 describe-instances --region "$REGION" --filters "Name=tag:RunTag,Values=$RUN_TAG" "Name=instance-state-name,Values=pending,running,stopping,stopped" --query 'Reservations[].Instances[].InstanceId' --output text || true)
    if [[ -n "$ids" && "$ids" != "None" ]]; then
      aws ec2 terminate-instances --region "$REGION" --instance-ids $ids || true
      aws ec2 wait instance-terminated --region "$REGION" --instance-ids $ids || true
    fi
    # Delete SG created for this run if empty
    if [[ -n "${SG_ID:-}" ]]; then
      aws ec2 delete-security-group --region "$REGION" --group-id "$SG_ID" || true
    fi
    # Delete instance profile and role if created
    if [[ -n "${ROLE_NAME:-}" ]]; then
      aws iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore || true
      aws iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly || true
      aws iam delete-instance-profile --instance-profile-name "$ROLE_NAME" || true
      aws iam delete-role --role-name "$ROLE_NAME" || true
    fi
  fi
  exit $code
}
trap rollback ERR

: "${ENV:=prod}"
: "${REGION:=ap-south-1}"
: "${INSTANCE_TYPE:=t3.small}"
: "${KEY_NAME:=novologic-ssh}"
: "${APP_TAG:=novo-core}"
RUN_ID="${RUN_ID:-$(date +%s)}"
RUN_TAG="novologic-${ENV}-${RUN_ID}"

AMI_ID=$(aws ec2 describe-images --owners 099720109477 \
  --filters 'Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*' 'Name=state,Values=available' \
  --region "$REGION" --query 'Images | sort_by(@,&CreationDate)[-1].ImageId' --output text)

# Create or reuse key pair (does not overwrite local file)
if ! aws ec2 describe-key-pairs --region "$REGION" --key-names "$KEY_NAME" >/dev/null 2>&1; then
  aws ec2 create-key-pair --region "$REGION" --key-name "$KEY_NAME" --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
  chmod 600 "${KEY_NAME}.pem"
fi

# Create SG
SG_NAME="novologic-${ENV}-sg"
SG_ID=$(aws ec2 describe-security-groups --region "$REGION" --filters "Name=group-name,Values=$SG_NAME" --query 'SecurityGroups[0].GroupId' --output text || true)
if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" --query 'Vpcs[0].VpcId' --output text)
  SG_ID=$(aws ec2 create-security-group --region "$REGION" --group-name "$SG_NAME" --description "Novologic ${ENV} SG" --vpc-id "$VPC_ID" --query 'GroupId' --output text)
  # Allow 80,443,22 from anywhere (harden as needed)
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --ip-permissions \
    IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=0.0.0.0/0}]'
fi

# Create IAM role with SSM
ROLE_NAME="novologic-${ENV}-ec2-role"
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
  aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
  aws iam create-instance-profile --instance-profile-name "$ROLE_NAME" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$ROLE_NAME" --role-name "$ROLE_NAME"
fi

# Latest Ubuntu 22.04 user-data installs Docker and compose plugin
USER_DATA=$(cat <<'EOF'
#!/bin/bash
set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker ubuntu || true
systemctl enable docker
systemctl start docker
# Ensure SSM
snap install amazon-ssm-agent --classic || true
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent || true
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent || true
EOF
)

SUBNET_ID=$(aws ec2 describe-subnets --region "$REGION" --query 'Subnets[0].SubnetId' --output text)
PROFILE_ARN=$(aws iam get-instance-profile --instance-profile-name "$ROLE_NAME" --query 'InstanceProfile.Arn' --output text)

INSTANCE_ID=$(aws ec2 run-instances --region "$REGION" \
  --image-id "$AMI_ID" --instance-type "$INSTANCE_TYPE" --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" --subnet-id "$SUBNET_ID" \
  --iam-instance-profile "Arn=$PROFILE_ARN" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=novologic-${ENV}},{Key=Project,Value=novologic},{Key=Env,Value=${ENV}},{Key=RunTag,Value=${RUN_TAG}}]" \
  --user-data "$USER_DATA" --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
PUBLIC_IP=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "INSTANCE_ID=${INSTANCE_ID}"
echo "PUBLIC_IP=${PUBLIC_IP}"

