import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Dashboard from '@/components/Dashboard';
import LoadingSpinner from '@/components/LoadingSpinner';

function DashboardContent({ userId }: Readonly<{ userId: string }>) {
  return <Dashboard />;
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth');
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent userId={session.user.id} />
    </Suspense>
  );
}
