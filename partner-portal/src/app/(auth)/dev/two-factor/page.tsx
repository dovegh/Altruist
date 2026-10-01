/**
 * Development preview of both two-factor states, so the screen can be
 * checked without enrolling a real account. Not available in production.
 */
import { notFound } from 'next/navigation';
import { Preview } from './Preview';

export default async function TwoFactorPreview({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { mode } = await searchParams;
  return <Preview mode={mode === 'verify' ? 'verify' : mode === 'loading' ? 'loading' : 'setup'} />;
}
