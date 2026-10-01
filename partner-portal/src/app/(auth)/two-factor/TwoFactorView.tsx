'use client';

/**
 * What the two-factor screen draws — no Supabase in here, so both states can
 * be previewed and tested without an account. `TwoFactor.tsx` supplies the
 * data and the actions.
 *
 *   setup   first sign-in: two numbered steps — scan the QR (or type the key),
 *           then enter the code the app shows.
 *   verify  every sign-in after: just the code, with the 30-second clock the
 *           authenticator app is counting down too.
 *
 * The code submits itself on the sixth digit; paste fills all six.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './twofactor.module.css';

export type TwoFactorViewProps = {
  mode: 'loading' | 'setup' | 'verify';
  /** Setup only: the QR as an SVG data URI, and the same secret as text. */
  qr?: string;
  secret?: string;
  busy: boolean;
  error: string | null;
  /** Bumped on every failed code, so the boxes clear each time — not only the first. */
  attempt: number;
  onSubmit: (code: string) => void;
  onBack: () => void;
};

const APPS = ['Google Authenticator', 'Microsoft Authenticator', '1Password', 'Authy'];

/** Seconds left in the current 30-second TOTP window — the same clock the phone app shows. */
function useTotpClock() {
  const [left, setLeft] = useState(30);
  useEffect(() => {
    const tick = () => setLeft(30 - (Math.floor(Date.now() / 1000) % 30));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

function CodeInput({
  disabled,
  invalid,
  onComplete,
  autoFocus,
}: {
  disabled: boolean;
  invalid: boolean;
  onComplete: (code: string) => void;
  autoFocus: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string[]) => {
    setDigits(next);
    if (next.every((d) => d !== '')) onComplete(next.join(''));
  };

  const put = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    if (clean.length > 1) {
      // Pasted or autofilled: spread from this box onwards.
      const next = [...digits];
      clean
        .slice(0, 6 - i)
        .split('')
        .forEach((d, k) => (next[i + k] = d));
      commit(next);
      boxes.current[Math.min(i + clean.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    commit(next);
    if (i < 5) boxes.current[i + 1]?.focus();
  };

  const box = (i: number) => (
    <input
      key={i}
      ref={(el) => {
        boxes.current[i] = el;
      }}
      className={[
        styles.codeBox,
        digits[i] ? styles.codeBoxFilled : '',
        invalid ? styles.codeBoxError : '',
      ].join(' ')}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete={i === 0 ? 'one-time-code' : 'off'}
      aria-label={`Digit ${i + 1} of 6`}
      value={digits[i]}
      disabled={disabled}
      onChange={(e) => put(i, e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
        if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus();
        if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus();
      }}
      autoFocus={autoFocus && i === 0}
    />
  );

  return (
    <div className={styles.codeRow} role="group" aria-label="6-digit code">
      {[0, 1, 2].map(box)}
      <span className={styles.codeGap} aria-hidden />
      {[3, 4, 5].map(box)}
    </div>
  );
}

function Clock() {
  const left = useTotpClock();
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <span className={styles.timer} aria-live="off">
      <svg className={styles.ring} viewBox="0 0 18 18" aria-hidden>
        <circle className={styles.ringTrack} cx="9" cy="9" r={r} fill="none" strokeWidth="2" />
        <circle
          className={styles.ringFill}
          cx="9"
          cy="9"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - left / 30)}
        />
      </svg>
      New code in 0:{String(left).padStart(2, '0')}
    </span>
  );
}

export function TwoFactorView({
  mode,
  qr,
  secret,
  busy,
  error,
  attempt,
  onSubmit,
  onBack,
}: TwoFactorViewProps) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const grouped = (secret ?? '').replace(/(.{4})/g, '$1 ').trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setShowKey(true);
    }
  };

  const codeBlock = (
    <>
      {/* Remounted after each wrong code: empty boxes, cursor in the first. */}
      <CodeInput
        key={attempt}
        disabled={busy}
        invalid={Boolean(error)}
        onComplete={onSubmit}
        autoFocus={mode === 'verify' || attempt > 0}
      />
      <div className={styles.codeMeta}>
        <Clock />
        {busy ? (
          <span className={styles.loading}>
            <span className={styles.spinner} aria-hidden /> Checking…
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="notice notice-danger" role="alert">
          <Icon name="danger" size={18} />
          <span>{error}</span>
        </div>
      ) : null}
    </>
  );

  return (
    <section className={`${styles.card} ${mode === 'setup' ? styles.cardWide : ''}`} aria-busy={busy}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="arrow-left" size={18} />
        Back to sign in
      </button>

      {mode === 'loading' ? (
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden /> Getting your sign-in ready…
        </div>
      ) : null}

      {mode === 'verify' ? (
        <>
          <div>
            <h2 className={styles.title}>Enter your code</h2>
            <p className={styles.sub}>
              Open your authenticator app and type the 6-digit code shown for{' '}
              <strong>Altruist</strong>.
            </p>
          </div>
          {codeBlock}
        </>
      ) : null}

      {mode === 'setup' ? (
        <>
          <div>
            <h2 className={styles.title}>Set up two-factor</h2>
            <p className={styles.sub}>
              One-time setup. After this, each sign-in asks for a code from your phone.
            </p>
          </div>

          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <div className={styles.stepBody}>
                <span className={styles.stepTitle}>Scan with an authenticator app</span>
                <div className={styles.scan}>
                  <div className={styles.qrTile}>
                    {qr ? (
                      // Supabase returns the QR as an SVG data URI.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr} alt="QR code to add Altruist to your authenticator app" />
                    ) : (
                      <span className={styles.qrPlaceholder} aria-hidden />
                    )}
                  </div>
                  <div className={styles.scanAside}>
                    <p className={styles.stepText}>
                      In the app, tap <strong>+</strong> or <strong>Add account</strong>, then scan
                      this code.
                    </p>
                    <div className={styles.apps}>
                      {APPS.map((a) => (
                        <span key={a} className={styles.app}>
                          {a}
                        </span>
                      ))}
                    </div>
                    {showKey ? (
                      <div className={styles.key}>
                        <span className={styles.keyText} aria-label="Setup key">
                          {grouped}
                        </span>
                        <button type="button" className={styles.copy} onClick={copy}>
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <button type="button" className={styles.keyToggle} onClick={() => setShowKey(true)}>
                        Can’t scan? Enter a setup key instead
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <div className={styles.stepBody}>
                <span className={styles.stepTitle}>Enter the 6-digit code it shows</span>
                {codeBlock}
              </div>
            </li>
          </ol>
        </>
      ) : null}

      <div className={styles.warning}>
        <Icon name="shield-check" size={18} />
        <span>
          <strong>Two-factor is mandatory here</strong>
          It cannot be turned off. This account can open patient prescription images, so a password
          alone is not sufficient protection.
        </span>
      </div>
    </section>
  );
}
