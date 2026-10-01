/**
 * The gate in front of every page.
 *
 *   no session            → /login (except the pages that work signed out)
 *   password only (aal1)  → /two-factor, carrying where they were going
 *   two-factor done       → the portal (and the sign-in pages bounce inward)
 *
 * Setting a new password after a reset link is allowed at aal1 only for an
 * account with no authenticator yet; anyone with one passes two-factor first
 * (Supabase also refuses a password change below aal2 for them).
 *
 * This is convenience routing. The real enforcement is in the database: the
 * portal functions and the image policy refuse anything short of aal2, so a
 * request that slipped past here would still get nothing.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Pages that work without a session. */
const SIGNED_OUT = ['/login', '/forgot-password', '/join'];

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
  const signedOutPage = SIGNED_OUT.includes(path);

  // The email-link callback and the dev previews handle themselves.
  if (path.startsWith('/auth/') || path.startsWith('/dev/')) return response;

  /** A redirect that keeps any refreshed session cookies. */
  const go = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return signedOutPage ? response : go('/login');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') {
    if (path === '/two-factor') return response;
    if (path === '/reset-password' && aal?.nextLevel !== 'aal2') return response;
    if (path === '/reset-password') return go('/two-factor?next=/reset-password');
    return go('/two-factor');
  }

  if (signedOutPage || path === '/two-factor') return go('/dashboard');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
