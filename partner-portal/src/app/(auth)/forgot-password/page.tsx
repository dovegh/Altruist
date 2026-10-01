'use client';

/**
 * Forgot password. Sends Supabase's reset email; the link returns through
 * /auth/callback to /reset-password. The reply is the same whether or not
 * the address has an account, so this page cannot be used to find out who
 * works at a pharmacy.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (sendError && /rate|too many/i.test(sendError.message)) {
      setError('Too many requests. Wait a minute, then try again.');
      return;
    }
    if (sendError && /network|fetch/i.test(sendError.message)) {
      setError('Could not reach Altruist. Check your connection and try again.');
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className={styles.card}>
        <div>
          <h2 className={styles.title}>Check your email</h2>
          <p className={styles.sub}>
            If <strong>{email.trim()}</strong> has a portal account, a link to set a new password is
            on its way. It expires after an hour.
          </p>
        </div>
        <Link href="/login" className="btn btn-secondary btn-block">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={send} noValidate>
      <Link href="/login" className={styles.back}>
        <Icon name="arrow-left" size={18} />
        Back to sign in
      </Link>
      <div>
        <h2 className={styles.title}>Reset your password</h2>
        <p className={styles.sub}>We’ll email you a link to choose a new one.</p>
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
          required
        />
      </label>
      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !/\S+@\S+\.\S+/.test(email)}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
