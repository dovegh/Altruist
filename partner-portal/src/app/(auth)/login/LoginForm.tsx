'use client';

/**
 * Sign in — Figma 147:182.
 *
 * Credentials are issued to the pharmacy; there is no sign-up here. A person
 * who signs in but is not on a pharmacy's staff is signed straight back out
 * with a plain reason, rather than left on a portal that shows them nothing.
 *
 * "Trust this device for 30 days" is in the design but not built: two-factor
 * is asked for on every sign-in until device trust exists server-side.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export function LoginForm({ linkExpired = false }: { linkExpired?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  // Back from an email link that had already been used or had expired.
  const [error, setError] = useState<string | null>(
    linkExpired ? 'That link has expired or was already used. Request a new one.' : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setBusy(false);
      setError(
        /invalid/i.test(signInError.message)
          ? 'That email and password do not match.'
          : 'Could not sign in. Check your connection and try again.',
      );
      return;
    }
    const { data: isStaff } = await supabase.rpc('portal_is_staff');
    if (!isStaff) {
      await supabase.auth.signOut();
      setBusy(false);
      setError('This account is not on a partner pharmacy’s staff. Ask your superintendent pharmacist to add you.');
      return;
    }
    router.replace('/two-factor');
    router.refresh();
  };

  return (
    <form className={styles.card} onSubmit={submit} noValidate>
      <div>
        <h2 className={styles.title}>Sign in</h2>
        <p className={styles.sub}>Use the credentials issued to your pharmacy.</p>
      </div>

      <label className="field">
        <span className="field-label">Work email</span>
        <input
          className="input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Password</span>
        <span style={{ position: 'relative', display: 'block' }}>
          <input
            className="input"
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: 56 }}
            required
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              width: 40,
              height: 40,
              border: 'none',
              background: 'none',
              color: 'var(--icon-secondary)',
              cursor: 'pointer',
            }}
          >
            <Icon name={reveal ? 'eye-off' : 'eye'} size={22} />
          </button>
        </span>
      </label>

      <div className={styles.row}>
        <span />
        <Link className="btn-link" href="/forgot-password">
          Forgot password?
        </Link>
      </div>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !email || !password}>
        {busy ? 'Signing in…' : 'Continue'}
        {busy ? null : <Icon name="arrow-right" size={20} />}
      </button>

      <div className="notice notice-info">
        <Icon name="shield-check" size={18} />
        <span>
          This portal displays patient prescriptions. Never share your login, and sign out on shared
          computers. Every prescription you open is logged against your name.
        </span>
      </div>

      <p className={styles.footer}>
        Invited by your pharmacy?{' '}
        <Link className="btn-link" href="/join">
          Create your account
        </Link>
        <br />
        Not a partner yet?{' '}
        <a className="btn-link" href="mailto:partners@altruist.gh?subject=Partner%20application">
          Apply to join
        </a>
      </p>
    </form>
  );
}
