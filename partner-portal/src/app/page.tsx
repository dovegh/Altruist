import { redirect } from 'next/navigation';

// The queue is where a pharmacist starts. The Dashboard comes later.
export default function Home() {
  redirect('/prescriptions');
}
