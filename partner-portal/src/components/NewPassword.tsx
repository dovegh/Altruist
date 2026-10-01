'use client';

/**
 * Two password fields and the rules, checked as you type. Shared by
 * /reset-password and /join. The rules match the patient app's
 * (set-password): 8+ characters, a letter and a number, both fields equal.
 */
import { useState } from 'react';
import { Icon } from '@/components/Icon';

export const passwordRules = (pw: string, again: string) => [
  { label: 'At least 8 characters', ok: pw.length >= 8 },
  { label: 'A letter and a number', ok: /[A-Za-z]/.test(pw) && /\d/.test(pw) },
  { label: 'Both passwords match', ok: pw.length > 0 && pw === again },
];

export function NewPassword({
  password,
  again,
  onPassword,
  onAgain,
}: {
  password: string;
  again: string;
  onPassword: (v: string) => void;
  onAgain: (v: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  const rules = passwordRules(password, again);

  return (
    <>
      <label className="field">
        <span className="field-label">New password</span>
        <span style={{ position: 'relative', display: 'block' }}>
          <input
            className="input"
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            style={{ paddingRight: 56 }}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide passwords' : 'Show passwords'}
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
      <label className="field">
        <span className="field-label">Repeat new password</span>
        <input
          className="input"
          type={reveal ? 'text' : 'password'}
          autoComplete="new-password"
          value={again}
          onChange={(e) => onAgain(e.target.value)}
        />
      </label>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }} aria-live="polite">
        {rules.map((r) => (
          <li
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: r.ok ? 'var(--text-success)' : 'var(--text-tertiary)',
            }}
          >
            <Icon name={r.ok ? 'check' : 'close'} size={16} />
            <span>
              {r.label}
              <span className="sr-only">{r.ok ? ' — done' : ' — not yet'}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
