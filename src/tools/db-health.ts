/**
* File: src/tools/db-health.ts
* Module: tools/db-health
* Purpose: Live-check Postgres connectivity and report issues
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - One-off or watch mode; JSON or pretty output
*/

import { Pool } from 'pg';
import { buildAppConfig } from '../shared/config/config.factory';
import { LoggerFactory } from '../shared/logger';

type Args = {
  watch: boolean;
  intervalMs: number;
  json: boolean;
  extensions: boolean;
  pretty: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { watch: false, intervalMs: 5000, json: false, extensions: false, pretty: true };
  for (const raw of argv) {
    if (raw === '--watch') args.watch = true;
    else if (raw.startsWith('--interval=')) args.intervalMs = parseInt(raw.split('=')[1] || '5000', 10) || 5000;
    else if (raw === '--json') args.json = true;
    else if (raw === '--extensions') args.extensions = true;
    else if (raw === '--no-pretty') args.pretty = false;
  }
  return args;
}

type ExitCode = 0 | 1 | 2 | 3 | 4 | 5;

async function probeOnce(pool: Pool, checkExtensions: boolean) {
  const start = process.hrtime.bigint();
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    const versionRes = await client.query('SHOW server_version');
    const version = versionRes.rows?.[0]?.server_version as string | undefined;
    let ext: { uuidOssp?: boolean; pgcrypto?: boolean } | undefined;
    if (checkExtensions) {
      const exts = await client.query('SELECT extname FROM pg_extension');
      const names = new Set<string>(exts.rows.map((r: any) => r.extname));
      ext = { uuidOssp: names.has('uuid-ossp'), pgcrypto: names.has('pgcrypto') };
      if (!ext.uuidOssp || !ext.pgcrypto) {
        return { ok: false, latencyMs: Number(0), version, extensions: ext, code: 5 as ExitCode, error: 'Missing required extensions' };
      }
    }
    const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    return { ok: true, latencyMs, version, extensions: ext, code: 0 as ExitCode };
  } catch (e: any) {
    const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    const msg = e?.message || 'Unknown error';
    const sqlState = e?.code as string | undefined;
    // Map to exit codes
    let code: ExitCode = 1;
    if (e?.code === 'ECONNREFUSED') code = 2;
    else if (sqlState === '28P01') code = 3; // auth failed
    else if (e?.code === 'ETIMEDOUT' || e?.name === 'TimeoutError') code = 4;
    return { ok: false, latencyMs, error: msg, sqlState, code };
  } finally {
    client?.release?.();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = buildAppConfig();
  const logger = LoggerFactory.create(config);
  const db = config.db!;
  const pool = new Pool({
    host: db.host,
    port: db.port,
    database: db.name,
    user: db.user,
    password: db.password,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
  });

  const log = (payload: any) => {
    if (args.json) {
      process.stdout.write(JSON.stringify(payload) + '\n');
    } else {
      logger.info(payload);
    }
  };

  const cycle = async () => {
    const ts = new Date().toISOString();
    const res = await probeOnce(pool, args.extensions);
    log({ ts, ok: res.ok, latencyMs: res.latencyMs, version: res.version, extensions: res.extensions, error: res.error, sqlState: res.sqlState });
    if (!args.watch) {
      await pool.end().catch(() => undefined);
      process.exit(res.code);
    }
  };

  await cycle();
  if (args.watch) {
    const timer = setInterval(cycle, args.intervalMs);
    const stop = async () => {
      clearInterval(timer);
      await pool.end().catch(() => undefined);
      process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }
}

main().catch((e) => {
  // Fallback fatal
  process.stderr.write(`db-health fatal: ${e?.message || e}\n`);
  process.exit(1);
});


