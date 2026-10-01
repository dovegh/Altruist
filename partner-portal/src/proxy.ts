/**
 * The gate in front of every page.
 *
 *   no session            → /login
 *   password only (aal1)  → /two-factor
 *   two-factor done       → the portal (and /login, /two-factor bounce inward)
 *
 * This is convenience routing. The real enforcement is in the database: the
 * portal functions and the image policy refuse anything short of aal2, so a
 * request that slipped past here would still get nothing.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const onLogin = path === '/login';
  const onTwoFactor = path === '/two-factor';

  /** A redirect that keeps any refreshed session cookies. */
  const go = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return onLogin ? response : go('/login');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return onTwoFactor ? response : go('/two-factor');

  if (onLogin || onTwoFactor) return go('/prescriptions');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
