/**
 * Read and change this project's Supabase auth configuration.
 *
 *   node tools/supabase-auth.mjs status
 *   node tools/supabase-auth.mjs dev-autoconfirm on
 *   node tools/supabase-auth.mjs dev-autoconfirm off
 *
 * WHY THIS EXISTS
 * Sign-up against a fresh Supabase project fails with `429 email rate limit
 * exceeded` once a handful of confirmation emails have been attempted. Per
 * Supabase's own documentation that limit is fixed: "You can only change this
 * with a custom SMTP setup." The built-in sender is a shared service and its
 * quota is not adjustable, so there are exactly two ways forward.
 *
 *   Development — stop sending the email. `mailer_autoconfirm` marks new
 *   accounts confirmed on creation, so /signup never touches the mailer and
 *   the rate limit can never be hit. Sign-up then returns a session straight
 *   away, which is the branch the register screen already handles.
 *
 *   Production — configure custom SMTP (see the bottom of this file). A
 *   pharmacy sending confirmations, password resets and prescription notices
 *   needs its own sender regardless; the shared one is unusable at any volume.
 *
 * WHAT `dev-autoconfirm on` COSTS YOU
 * Nobody has to prove they own an address any more. Anyone can register as
 * anyone. That is fine on a development project and NOT fine in production —
 * an unverified address means password resets can be aimed at a mailbox the
 * account holder does not control. Turn it back off before you ship, at which
 * point you need custom SMTP anyway.
 *
 * THE TOKEN
 * Needs a personal access token from
 * https://supabase.com/dashboard/account/tokens, in the environment rather
 * than on the command line, so it stays out of your shell history:
 *
 *   setx SUPABASE_ACCESS_TOKEN "sbp_..."      (Windows, new shell after)
 *   export SUPABASE_ACCESS_TOKEN="sbp_..."    (bash)
 *
 * It is never read from .env and never written anywhere by this script.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const DIM = '\u001b[2m';
const OFF = '\u001b[0m';

/** The project ref, read from .env so this file has no hardcoded identity. */
function projectRef() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  const raw = readFileSync(envPath, 'utf8');
  const url = raw.match(/^\s*EXPO_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/m)?.[1]?.trim();
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set in .env');
  const ref = url.replace(/^https:\/\/([^.]+)\..*$/, '$1');
  if (!ref || ref === url) throw new Error(`Could not read a project ref from ${url}`);
  return ref;
}

async function api(method, ref, token, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} — ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

/** The handful of fields that decide whether sign-up sends mail. */
function summarise(config) {
  const rows = [
    ['mailer_autoconfirm', config.mailer_autoconfirm, 'true = no confirmation email is sent'],
    ['external_email_enabled', config.external_email_enabled, 'email/password sign-in allowed'],
    ['smtp_host', config.smtp_host || '(built-in shared sender)', 'custom SMTP host'],
    ['smtp_admin_email', config.smtp_admin_email || '—', 'from address'],
    ['external_google_enabled', config.external_google_enabled, 'Google sign-in'],
  ];
  for (const [key, value, note] of rows) {
    console.log(`  ${String(key).padEnd(26)} ${String(value).padEnd(28)} ${DIM}${note}${OFF}`);
  }
  if (config.mailer_autoconfirm) {
    console.log(
      `\n${YELLOW}  Confirmation email is OFF. Sign-up returns a session immediately and the` +
        `\n  rate limit cannot be hit. Addresses are UNVERIFIED — development only.${OFF}`,
    );
  } else if (!config.smtp_host) {
    console.log(
      `\n${YELLOW}  Confirmation email is ON and sending through the shared built-in sender,` +
        `\n  whose hourly quota is fixed and cannot be raised. This is what produces` +
        `\n  "429 email rate limit exceeded" on sign-up.${OFF}`,
    );
  }
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRef();

  console.log(`\n${DIM}Supabase auth config — project ${ref}${OFF}\n`);

  if (!token) {
    console.log(`${RED}  SUPABASE_ACCESS_TOKEN is not set.${OFF}`);
    console.log(
      `\n${DIM}  Create one at https://supabase.com/dashboard/account/tokens, then:\n` +
        `    setx SUPABASE_ACCESS_TOKEN "sbp_..."   and open a new terminal\n` +
        `  It is read from the environment only, never from .env.${OFF}\n`,
    );
    process.exit(1);
  }

  if (command === 'status') {
    summarise(await api('GET', ref, token));
    console.log('');
    return;
  }

  if (command === 'dev-autoconfirm' && (arg === 'on' || arg === 'off')) {
    const on = arg === 'on';
    if (on) {
      console.log(
        `${YELLOW}  Turning confirmation emails OFF. New accounts will be created already` +
          `\n  confirmed, without anyone proving they own the address. Development only.${OFF}\n`,
      );
    }
    await api('PATCH', ref, token, { mailer_autoconfirm: on });
    console.log(`${GREEN}  mailer_autoconfirm = ${on}${OFF}\n`);
    summarise(await api('GET', ref, token));
    console.log('');
    return;
  }

  console.log(`${DIM}  Usage:
    node tools/supabase-auth.mjs status
    node tools/supabase-auth.mjs dev-autoconfirm on
    node tools/supabase-auth.mjs dev-autoconfirm off

  For production, configure custom SMTP instead of autoconfirm — dashboard
  under Authentication > Emails > SMTP Settings, or:

    curl -X PATCH "https://api.supabase.com/v1/projects/${ref}/config/auth" \\
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"smtp_host":"...","smtp_port":587,"smtp_user":"...","smtp_pass":"...",
           "smtp_admin_email":"no-reply@yourdomain","smtp_sender_name":"Altruist"}'

  A custom sender starts at 30 messages/hour and is adjustable from there.${OFF}\n`);
  process.exit(1);
}

main().catch((error) => {
  console.error(`\n${RED}  Failed:${OFF} ${error.message}\n`);
  process.exit(1);
});
