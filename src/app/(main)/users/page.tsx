import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUsers } from '@/actions/users';
import { UserList } from '@/components/users/UserList';
import { NewUserDialog } from '@/components/users/NewUserDialog';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== 'admin' && user?.role !== 'editor') {
    redirect('/');
  }
  const users = await getUsers();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <NewUserDialog />
      </div>
      <UserList initialUsers={users} currentUser={user} />
    </div>
  );
}
