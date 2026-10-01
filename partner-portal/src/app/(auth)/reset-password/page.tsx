'use client';

/**
 * Set a new password — reached from the reset email via /auth/callback.
 * Supabase signs out every other session when the password changes, which is
 * what you want after a reset: anyone who had the old one is out.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewPassword, passwordRules } from '@/components/NewPassword';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = passwordRules(password, again).every((r) => r.ok);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError(
        /different|same/i.test(updateError.message)
          ? 'Choose a password you have not used here before.'
          : /weak|pwned|leaked/i.test(updateError.message)
            ? 'That password has appeared in a data breach. Choose another.'
            : 'The password was not changed. The link may have expired — request a new one.',
      );
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  };

  return (
    <form className={styles.card} onSubmit={save} noValidate>
      <div>
        <h2 className={styles.title}>Choose a new password</h2>
        <p className={styles.sub}>Other devices signed in to this account will be signed out.</p>
      </div>
      <NewPassword password={password} again={again} onPassword={setPassword} onAgain={setAgain} />
      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}
      <button className="btn btn-primary btn-lg btn-block" disabled={busy || !valid}>
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  );
}
