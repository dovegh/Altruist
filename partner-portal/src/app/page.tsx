import { redirect } from 'next/navigation';

// The Dashboard is where a pharmacist starts: what is waiting, what is late.
export default function Home() {
  redirect('/dashboard');
}
