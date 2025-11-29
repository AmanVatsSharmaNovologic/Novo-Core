/**
* File: src/migrations/20251129T131500-add-portfolios-projects-teams.ts
* Module: migrations
* Purpose: Add portfolios, projects, teams, and team_members tables for construction SaaS org structure.
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-29
*/

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPortfoliosProjectsTeams20251129131500 implements MigrationInterface {
  name = 'AddPortfoliosProjectsTeams20251129131500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(256) NOT NULL,
        type varchar(32) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'active',
        description varchar(512) NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portfolios_tenant_id ON portfolios(tenant_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        name varchar(256) NOT NULL,
        code varchar(64) NOT NULL,
        location varchar(256) NULL,
        status varchar(24) NOT NULL DEFAULT 'active',
        start_date date NULL,
        end_date date NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, code)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects(portfolio_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name varchar(256) NOT NULL,
        kind varchar(64) NULL,
        description varchar(512) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_teams_project_id ON teams(project_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_name varchar(64) NULL,
        status varchar(24) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, team_id, user_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_team_members_tenant_id ON team_members(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS team_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolios`);
  }
}



