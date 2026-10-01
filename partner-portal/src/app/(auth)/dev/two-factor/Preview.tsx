'use client';

import { useState } from 'react';
import { TwoFactorView } from '../../two-factor/TwoFactorView';

export function Preview({ mode }: { mode: 'setup' | 'verify' | 'loading' }) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  return (
    <TwoFactorView
      mode={mode}
      secret="JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"
      busy={false}
      error={error}
      attempt={attempt}
      onSubmit={(code) => {
        if (code === '123456') return setError(null);
        setAttempt((n) => n + 1);
        setError('That code didn’t match. Codes change every 30 seconds — enter the one showing now.');
      }}
      onBack={() => setError(null)}
    />
  );
}
