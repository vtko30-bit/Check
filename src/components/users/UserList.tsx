'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { UserDetailModal } from './UserDetailModal';
import { cn } from '@/lib/utils';

const roleLabels: Record<string, string> = {
  admin: 'Super Admin',
  editor: 'Administrador',
  viewer: 'Usuario',
};

export function UserList({ initialUsers, currentUser }: { initialUsers: User[]; currentUser?: { role?: string } }) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function openUserDetail(user: User) {
    setSelectedUser(user);
    setModalOpen(true);
  }

  return (
    <>
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[500px]">
          <thead className="text-slate-500 border-b bg-slate-50">
            <tr>
              <th className="px-6 py-3 font-medium">Usuario</th>
              <th className="px-6 py-3 font-medium">Correo</th>
              <th className="px-6 py-3 font-medium">Rol</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((user) => (
            <tr 
              key={user.id} 
              className={cn(
                "border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors",
                user.isActive === false && "opacity-60 bg-slate-50/50"
              )}
              onClick={() => openUserDetail(user)}
            >
              <td className="px-6 py-4">
                <span className="font-medium">{user.name}</span>
              </td>
              <td className="px-6 py-4 text-slate-600">{user.email}</td>
              <td className="px-6 py-4">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {roleLabels[user.role] || user.role}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <UserDetailModal
      user={selectedUser}
      open={modalOpen}
      onClose={() => { setModalOpen(false); setSelectedUser(null); }}
      onSaved={() => router.refresh()}
      onSaveAndClose={() => {
        router.refresh();
        setModalOpen(false);
        setSelectedUser(null);
      }}
      currentUserRole={currentUser?.role}
    />
    </>
  );
}
