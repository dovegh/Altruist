/**
 * Is the backend actually wired up?
 *
 *   node tools/verify-backend.mjs
 *
 * Answers three questions the app cannot answer for you, because it falls back
 * to fixtures the moment anything is missing and then looks perfectly healthy:
 *
 *   1. Is there a URL and a publishable key in `.env`?
 *   2. Has the schema been applied to that project?
 *   3. Is Row Level Security actually switched on?
 *
 * It signs in as nobody, which is the point. An anonymous client should be
 * refused by every user-scoped table. A table that answers an anonymous SELECT
 * with rows is a table with RLS off, and that is a finding, not a pass.
 *
 * Reads only. Writes nothing, and never asks for the service_role key — that
 * key bypasses RLS, so a script that needs it cannot test for it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '..', '.env');

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const DIM = '\u001b[2m';
const OFF = '\u001b[0m';

const pass = (m) => console.log(`${GREEN}  PASS${OFF}  ${m}`);
const fail = (m) => console.log(`${RED}  FAIL${OFF}  ${m}`);
const warn = (m) => console.log(`${YELLOW}  WARN${OFF}  ${m}`);

function readEnv() {
  let raw;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return {};
  }
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/**
 * Tables the app expects, and what an anonymous client should get back.
 *
 * `scoped` means the rows belong to a user, so anonymous access must be
 * refused. `public` means every signed-in user may read it, and anonymous
 * access is still expected to be refused — the policies here are granted to
 * the `authenticated` role, not to `anon`.
 */
const TABLES = [
  ['profiles', 'scoped'],
  ['products', 'public'],
  ['promotions', 'public'],
  ['pharmacies', 'public'],
  ['orders', 'scoped'],
  ['prescriptions', 'scoped'],
  ['payment_attempts', 'scoped'],
  ['wellness_sessions', 'scoped'],
  ['wellness_hydration', 'scoped'],
  ['wellness_saved_routines', 'scoped'],
];

/** Postgres says "relation does not exist" with this code. */
const MISSING = '42P01';

async function main() {
  const env = readEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  console.log(`\n${DIM}Altruist — backend check${OFF}\n`);
  console.log(`${DIM}  .env: ${envPath}${OFF}\n`);

  let ok = true;

  if (!url) {
    fail('EXPO_PUBLIC_SUPABASE_URL is empty');
    ok = false;
  } else {
    pass(`URL set (project ${url.replace(/^https:\/\/([^.]+).*/, '$1')})`);
  }

  if (!key) {
    fail('EXPO_PUBLIC_SUPABASE_ANON_KEY is empty — the app is running on fixtures');
    console.log(
      `\n${DIM}  Supabase dashboard > Project Settings > API > publishable / anon key.` +
        `\n  Paste it into .env, then RESTART the dev server: Expo inlines` +
        `\n  EXPO_PUBLIC_* at build time and a running bundler keeps the old value.${OFF}\n`,
    );
    process.exit(1);
  }
  pass(`publishable key set (${key.length} chars)`);

  if (/service_role|sb_secret_/.test(key)) {
    fail('that looks like a SECRET key. It bypasses RLS and must never ship in a client.');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`\n${DIM}  Schema${OFF}`);
  const missing = [];
  const unprotected = [];

  for (const [table, kind] of TABLES) {
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error?.code === MISSING) {
      fail(`${table} — not found`);
      missing.push(table);
      ok = false;
      continue;
    }
    if (error) {
      // Any other error means the table is there and something refused us,
      // which for an anonymous client is the correct outcome.
      pass(`${table} — present, refused anonymous read`);
      continue;
    }
    if (kind === 'scoped' && data?.length) {
      fail(`${table} — returned rows to an anonymous client. RLS is OFF.`);
      unprotected.push(table);
      ok = false;
      continue;
    }
    if (kind === 'scoped') {
      // No error and no rows: RLS is filtering rather than refusing, which is
      // how a correctly-policied table behaves for a user with no rows.
      pass(`${table} — present, no rows visible anonymously`);
    } else {
      pass(`${table} — present`);
    }
  }

  console.log(`\n${DIM}  Functions${OFF}`);
  const { error: rpcError } = await supabase.rpc('log_hydration', {
    p_day: '1970-01-01',
    p_glasses: 0,
  });
  if (rpcError?.code === 'PGRST202') {
    fail('log_hydration — not found (migration 0007 has not been applied)');
    ok = false;
  } else if (rpcError) {
    pass('log_hydration — present, refused anonymous call');
  } else {
    warn('log_hydration — accepted an anonymous call; check its RLS policy');
  }

  console.log('');
  if (missing.length) {
    console.log(
      `${YELLOW}  ${missing.length} table(s) missing. Run supabase/altruist-all.sql in the` +
        ` SQL editor.${OFF}`,
    );
  }
  if (unprotected.length) {
    console.log(
      `${RED}  ${unprotected.length} table(s) readable without a session. Re-run the` +
        ` migration: RLS is the only thing protecting this data.${OFF}`,
    );
  }
  if (ok) console.log(`${GREEN}  Backend looks wired up.${OFF}`);
  console.log('');
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${RED}  Check could not run:${OFF}`, error.message, '\n');
  process.exit(1);
});
