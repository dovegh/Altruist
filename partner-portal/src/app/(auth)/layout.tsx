/**
 * Sign-in and two-factor share this frame — Figma "Partner — Login" (147:182)
 * and "Partner — Two-Factor" (147:232): a 560px mint brand panel on the left,
 * the form card centred on the canvas to the right.
 */
import { Icon } from '@/components/Icon';
import styles from './auth.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame}>
      <aside className={styles.brand}>
        <div className={`display ${styles.wordmark}`}>Altruist</div>
        <div className={styles.pitch}>
          <h1 className={styles.pitchTitle}>Partner Portal</h1>
          <p className={styles.pitchBody}>
            Review prescriptions, fulfil orders and manage your listing — for pharmacies licensed by
            the Pharmacy Council.
          </p>
        </div>
        <p className={styles.restriction}>
          <Icon name="shield-check" size={20} />
          <span>
            Access is restricted to pharmacies holding a current Pharmacy Council premises licence.
            Accounts are suspended automatically when a licence lapses.
          </span>
        </p>
        <div className={styles.watermark} aria-hidden>
          <Icon name="upload" size={260} />
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
