'use client';

/**
 * "Upload renewed licence": file + new expiry date.
 *
 * The file goes straight from the browser to the private `licences` bucket,
 * into `{pharmacy_id}/…` — the storage policy only lets the superintendent,
 * on a two-factor session, write into their own pharmacy's folder. Then the
 * server action records the submission. The licence on file does not change
 * until Altruist has checked the document.
 */
import { useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { supabaseBrowser } from '@/lib/supabase/client';
import { submitLicence } from './actions';
import styles from './settings.module.css';

const TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024;

export function LicenceUpload({ pharmacyId, minExpiry }: { pharmacyId: string; minExpiry: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [expires, setExpires] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setExpires('');
    setError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) return setError('Choose the licence file.');
    if (!TYPES.includes(file.type)) return setError('The licence must be a PDF, JPEG or PNG.');
    if (file.size > MAX_BYTES) return setError('The file is larger than 10 MB.');
    if (!expires || expires < minExpiry) return setError('The expiry date must be in the future.');

    startTransition(async () => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
      const path = `${pharmacyId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabaseBrowser().storage.from('licences').upload(path, file);
      if (uploadError) {
        setError(
          /row-level security|unauthori[sz]ed|403/i.test(uploadError.message)
            ? 'The upload was refused. Sign in again with two-factor, then retry.'
            : 'The file did not upload. Check your connection and try again.',
        );
        return;
      }
      const result = await submitLicence(path, expires);
      if (result?.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
      setDone(true);
    });
  };

  if (!open) {
    return (
      <>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          <Icon name="upload" size={20} />
          Upload renewed licence
        </button>
        {done ? (
          <p className={styles.submission} role="status">
            Submitted. Altruist will check it and update your licence.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <form className={styles.upload} onSubmit={submit} noValidate>
      <label className="field">
        <span className="field-label">Licence document</span>
        <input
          ref={fileInput}
          className={styles.file}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-describedby="licence-file-help"
          disabled={pending}
        />
        <span id="licence-file-help" className="field-help">
          PDF, JPEG or PNG, up to 10 MB.
        </span>
      </label>
      <label className="field">
        <span className="field-label">New expiry date</span>
        <input
          className="input"
          type="date"
          min={minExpiry}
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          disabled={pending}
        />
      </label>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.uploadActions}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Uploading…' : 'Submit for review'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
