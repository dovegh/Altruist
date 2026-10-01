/**
 * Supabase for server components and server actions.
 *
 * Runs as the signed-in staff member, with their session from cookies. The
 * portal never holds a service-role key: everything it may do is decided by
 * the `portal_*` functions in migration 0018, which check staff membership,
 * role and two-factor in the database.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server components cannot set cookies; the proxy refreshes them.
          }
        },
      },
    },
  );
}
