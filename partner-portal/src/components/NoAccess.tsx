'use client';

/** Signed in, but not active staff at a pharmacy. Says so, and offers the way out. */
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function NoAccess() {
  const router = useRouter();
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="card" style={{ maxWidth: 460, padding: 40, display: 'grid', gap: 16 }}>
        <h1 style={{ fontSize: 24 }}>No portal access</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          This account is not active staff at a partner pharmacy, or your session needs two-factor
          again. Ask your superintendent pharmacist if you should have access.
        </p>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            await supabaseBrowser().auth.signOut();
            router.replace('/login');
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
