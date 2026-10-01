/**
 * The sidebar sections that are designed but not built yet. Each says what it
 * will do, rather than leading to an empty screen or a 404.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const SOON: Record<string, { title: string; body: string }> = {
  dashboard: {
    title: 'Dashboard',
    body: 'Today at a glance: prescriptions waiting, orders in flight, and how many days are left on your Pharmacy Council licence.',
  },
  inventory: {
    title: 'Inventory',
    body: 'Set prices and mark products in or out of stock for your pharmacy.',
  },
  payouts: {
    title: 'Payouts',
    body: 'Weekly settlements: order totals, delivery collected, Altruist commission and what is paid to you.',
  },
  staff: {
    title: 'Staff',
    body: 'Invite pharmacists and counter staff. Only Pharmacy Council-registered pharmacists can approve prescriptions.',
  },
  settings: {
    title: 'Settings & licence',
    body: 'Pharmacy details, opening hours and your premises licence.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return { title: SOON[section]?.title ?? 'Not found' };
}

export default async function SoonPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = SOON[section];
  if (!page) notFound();

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">{page.title}</h1>
          <p className="page-sub">Coming next</p>
        </div>
      </header>
      <div className="empty" style={{ textAlign: 'left', padding: 32, maxWidth: 640 }}>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 15 }}>{page.body}</p>
        <Link className="btn btn-primary" href="/prescriptions">
          Go to prescriptions
        </Link>
      </div>
    </div>
  );
}
