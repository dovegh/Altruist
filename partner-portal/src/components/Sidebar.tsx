'use client';

/**
 * The canonical 8-item sidebar (Screen Specifications §67–73), identical on
 * every portal screen. Active item: brand-subtle fill with brand text. The
 * signed-in person and their Pharmacy Council number are pinned to the bottom
 * — the same name every prescription they open is logged against.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './Sidebar.module.css';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/orders', label: 'Incoming orders', icon: 'cart' },
  { href: '/prescriptions', label: 'Prescriptions', icon: 'prescription' },
  { href: '/fulfilment', label: 'Fulfilment', icon: 'arrow-right' },
  { href: '/inventory', label: 'Inventory', icon: 'catalog' },
  { href: '/payouts', label: 'Payouts', icon: 'wallet' },
  { href: '/staff', label: 'Staff', icon: 'profile' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({
  name,
  initials,
  detail,
  waiting,
}: {
  name: string;
  initials: string;
  detail: string;
  /** Prescriptions waiting for review, shown beside the nav item. */
  waiting: number;
}) {
  const path = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <nav className={styles.sidebar} aria-label="Portal">
      <Link href="/prescriptions" className={`display ${styles.wordmark}`}>
        Altruist
      </Link>

      <ul className={styles.nav}>
        {NAV.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.item}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
                {item.href === '/prescriptions' && waiting > 0 ? (
                  <span className={styles.badge} aria-label={`${waiting} waiting`}>
                    {waiting}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={styles.me}>
        <span className={styles.avatar} aria-hidden>
          {initials}
        </span>
        <span className={styles.meText}>
          <span className={styles.meName}>{name}</span>
          <span className={styles.meDetail}>{detail}</span>
        </span>
        <button type="button" className={styles.signOut} onClick={signOut} aria-label="Sign out">
          <Icon name="logout" size={18} />
        </button>
      </div>
    </nav>
  );
}
