/**
 * Every signed-in portal screen: sidebar + main column.
 *
 * `portal_me` returns nothing unless the caller is active staff with a
 * two-factor session, so reaching this layout without it shows a plain
 * "no access" state instead of an empty portal.
 */
import { NoAccess } from '@/components/NoAccess';
import { Sidebar } from '@/components/Sidebar';
import { awaitingReview, getMe, getQueue, initials, ROLE_LABEL } from '@/lib/portal';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) return <NoAccess />;

  const waiting = awaitingReview(await getQueue().catch(() => [])).length;
  const detail = [ROLE_LABEL[me.role], me.pc_number ? `PC ${me.pc_number}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar name={me.full_name} initials={initials(me.full_name)} detail={detail} waiting={waiting} />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
