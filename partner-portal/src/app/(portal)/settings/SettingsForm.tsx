'use client';

/**
 * Pharmacy profile + availability, saved together.
 *
 * Everyone can read it; only the superintendent can change it, so for anyone
 * else the whole fieldset is disabled with the reason on one line. Opening
 * hours and radius are shown as read-out rows (as in the design) and turn into
 * inputs on "Edit", so the common case — flipping "Accepting new orders" — is
 * one switch and one Save.
 */
import { useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { updatePharmacy } from './actions';
import styles from './settings.module.css';
import type { PharmacyUpdate } from './types';

export function SettingsForm({
  canManage,
  name,
  initial,
}: {
  canManage: boolean;
  name: string;
  initial: PharmacyUpdate;
}) {
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [hours, setHours] = useState(initial.opening_hours);
  const [radius, setRadius] = useState(initial.delivery_radius_km === null ? '' : String(initial.delivery_radius_km));
  const [accepting, setAccepting] = useState(initial.accepting_orders);
  const [editing, setEditing] = useState<{ hours: boolean; radius: boolean }>({ hours: false, radius: false });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setSaved(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!address.trim()) {
      setError('Enter the street address patients and riders should use.');
      return;
    }
    const km = radius.trim() === '' ? null : Number(radius);
    if (km !== null && (!Number.isFinite(km) || km <= 0 || km > 100)) {
      setError('Delivery radius must be more than 0 km and no more than 100 km.');
      return;
    }
    startTransition(async () => {
      const result = await updatePharmacy({
        address,
        phone,
        opening_hours: hours,
        delivery_radius_km: km,
        accepting_orders: accepting,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setEditing({ hours: false, radius: false });
      }
    });
  };

  const street = address.split(',')[0]?.trim();

  return (
    <form className={styles.main} onSubmit={submit} noValidate>
      {!canManage ? (
        <p className="notice notice-info" style={{ margin: 0 }}>
          <Icon name="info" size={16} />
          Only the superintendent can change these settings.
        </p>
      ) : null}

      <fieldset className={styles.fieldset} disabled={!canManage || pending}>
        <section className={`${styles.card} ${styles.formCard}`} aria-labelledby="profile-title">
          <h2 id="profile-title" className="eyebrow">
            Pharmacy profile
          </h2>
          <label className="field">
            <span className="field-label">Trading name</span>
            <input className="input" value={name} readOnly aria-describedby="name-help" />
            <span id="name-help" className="field-help">
              Matches your premises licence, so it cannot be changed here.
            </span>
          </label>
          <label className="field">
            <span className="field-label">Street address</span>
            <input
              className="input"
              value={address}
              onChange={(e) => touch(setAddress)(e.target.value)}
              required
              maxLength={200}
              autoComplete="street-address"
            />
          </label>
          <label className="field">
            <span className="field-label">Contact phone</span>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => touch(setPhone)(e.target.value)}
              maxLength={30}
              autoComplete="tel"
              placeholder="+233 …"
            />
          </label>
        </section>

        <section className={`${styles.card} ${styles.formCard}`} aria-labelledby="availability-title">
          <h2 id="availability-title" className="eyebrow">
            Availability
          </h2>

          <div className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="check" size={18} />
            </span>
            <div className={styles.rowBody}>
              <span id="accepting-label" className={styles.rowTitle}>
                Accepting new orders
              </span>
              <span id="accepting-help" className={styles.rowSub}>
                Turn off to pause routing without closing your account
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={accepting}
              aria-labelledby="accepting-label"
              aria-describedby="accepting-help"
              className={styles.switch}
              onClick={() => touch(setAccepting)(!accepting)}
            >
              <span className={styles.knob} />
            </button>
          </div>

          <div className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="clock" size={18} />
            </span>
            <div className={styles.rowBody}>
              <label htmlFor="opening-hours" className={styles.rowTitle}>
                Opening hours
              </label>
              {editing.hours ? (
                <input
                  id="opening-hours"
                  className={`input ${styles.rowInput}`}
                  value={hours}
                  onChange={(e) => touch(setHours)(e.target.value)}
                  maxLength={120}
                  placeholder="Mon–Sat 08:00–21:00 · Sun 10:00–18:00"
                  autoFocus
                />
              ) : (
                <span className={styles.rowSub}>{hours.trim() || 'Not set'}</span>
              )}
            </div>
            <button
              type="button"
              className={`btn-link ${styles.rowEdit}`}
              aria-label={editing.hours ? 'Done editing opening hours' : 'Edit opening hours'}
              onClick={() => setEditing((x) => ({ ...x, hours: !x.hours }))}
            >
              {editing.hours ? 'Done' : 'Edit'}
            </button>
          </div>

          <div className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="location" size={18} />
            </span>
            <div className={styles.rowBody}>
              <label htmlFor="delivery-radius" className={styles.rowTitle}>
                Delivery radius
              </label>
              {editing.radius ? (
                <span className={styles.kmField}>
                  <input
                    id="delivery-radius"
                    className={`input ${styles.rowInput}`}
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={radius}
                    onChange={(e) => touch(setRadius)(e.target.value)}
                    aria-describedby="radius-help"
                    autoFocus
                  />
                  <span id="radius-help" className={styles.rowSub}>
                    km, up to 100
                  </span>
                </span>
              ) : (
                <span className={styles.rowSub}>
                  {radius.trim() ? `${radius} km${street ? ` from ${street}` : ''}` : 'Not set'}
                </span>
              )}
            </div>
            <button
              type="button"
              className={`btn-link ${styles.rowEdit}`}
              aria-label={editing.radius ? 'Done editing delivery radius' : 'Edit delivery radius'}
              onClick={() => setEditing((x) => ({ ...x, radius: !x.radius }))}
            >
              {editing.radius ? 'Done' : 'Edit'}
            </button>
          </div>
        </section>
      </fieldset>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className={styles.saveRow}>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <span className={styles.saved} role="status">
            {saved ? 'Saved.' : ''}
          </span>
        </div>
      ) : null}
    </form>
  );
}
