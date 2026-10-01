'use client';

/**
 * Accept a staff invite: create the account with the email the
 * superintendent invited. Becoming staff happens in the database when the
 * email is confirmed (0021 `link_staff_invite`) — this page only makes the
 * login. Someone who was not invited ends up with an account that the
 * portal refuses, the same as any patient account.
 */
import { useState } from 'react';
import Link from 'next/link';
import { NewPassword, passwordRules } from '@/components/NewPassword';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function JoinPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /\S+@\S+\.\S+/.test(email) && passwordRules(password, again).every((r) => r.ok);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error: signUpError } = await supabaseBrowser().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/two-factor` },
    });
    setBusy(false);
    if (signUpError) {
      setError(
        /weak|pwned|leaked/i.test(signUpError.message)
          ? 'That password has appeared in a data breach. Choose another.'
          : /rate|too many/i.test(signUpError.message)
            ? 'Too many attempts. Wait a minute, then try again.'
            : 'The account was not created. Check the email address and try again.',
      );
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className={styles.card}>
        <div>
          <h2 className={styles.title}>Confirm your email</h2>
          <p className={styles.sub}>
            We sent a link to <strong>{email.trim()}</strong>. Open it on this computer — you’ll
            come back here to set up two-factor, and your pharmacy access starts then.
          </p>
        </div>
        <p className={styles.sub} style={{ margin: 0 }}>
          Already had an Altruist account with this email? Then no email comes —{' '}
          <Link className="btn-link" href="/login">
            sign in
          </Link>{' '}
          or{' '}
          <Link className="btn-link" href="/forgot-password">
            reset your password
          </Link>{' '}
          instead.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={create} noValidate>
      <div>
        <h2 className={styles.title}>Join your pharmacy</h2>
        <p className={styles.sub}>
          For staff your superintendent pharmacist has invited. Use the email the invite was sent
          to.
        </p>
      </div>
      <label className="field">
        <span className="field-label">Work email</span>
        <input
          className="input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </label>
      <NewPassword password={password} again={again} onPassword={setPassword} onAgain={setAgain} />
      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !valid}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
      <p className={styles.footer}>
        Already have an account?{' '}
        <Link className="btn-link" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
