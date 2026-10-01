'use client';

/**
 * Two-factor — Figma 147:232, with Supabase's authenticator-app (TOTP) MFA.
 *
 * The design sends an SMS code. This uses an authenticator app instead: it is
 * what Supabase provides without a paid add-on, and it does not depend on a
 * phone network being up.
 *
 * It cannot be skipped. The database refuses every portal function and the
 * prescription images to a session that has not passed this step.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { TwoFactorView } from './TwoFactorView';

type State =
  | { mode: 'loading' }
  | { mode: 'verify'; factorId: string }
  | { mode: 'setup'; factorId: string; qr: string; secret: string };

export function TwoFactor() {
  const router = useRouter();
  const [state, setState] = useState<State>({ mode: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setError('Could not load your sign-in settings. Refresh to try again.');
        return;
      }
      const verified = data.totp.find((f) => f.status === 'verified');
      if (verified) {
        setState({ mode: 'verify', factorId: verified.id });
        return;
      }
      // A half-finished setup from an earlier visit would block a new one.
      for (const f of data.all.filter((x) => x.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Altruist portal ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError || !enrolled) {
        setError('Could not start two-factor setup. Refresh to try again.');
        return;
      }
      setState({
        mode: 'setup',
        factorId: enrolled.id,
        qr: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    })();
  }, []);

  const submit = async (code: string) => {
    if (state.mode === 'loading' || busy) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabaseBrowser().auth.mfa.challengeAndVerify({
      factorId: state.factorId,
      code,
    });
    if (verifyError) {
      setBusy(false);
      setAttempt((n) => n + 1);
      setError('That code didn’t match. Codes change every 30 seconds — enter the one showing now.');
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  };

  const back = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <TwoFactorView
      mode={state.mode}
      qr={state.mode === 'setup' ? state.qr : undefined}
      secret={state.mode === 'setup' ? state.secret : undefined}
      busy={busy}
      error={error}
      attempt={attempt}
      onSubmit={submit}
      onBack={back}
    />
  );
}
