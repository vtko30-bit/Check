'use client';

import { User } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { updateUserRole } from '@/actions/users';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador'
};

export function UserList({ initialUsers }: { initialUsers: User[] }) {
  async function handleRoleChange(userId: string, newRole: string) {
    await updateUserRole(userId, newRole as any);
  }

  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <table className="w-full text-sm text-left min-w-[600px]">
        <thead className="text-slate-500 border-b bg-slate-50">
          <tr>
            <th className="px-6 py-3 font-medium">Usuario</th>
            <th className="px-6 py-3 font-medium">Correo</th>
            <th className="px-6 py-3 font-medium">Rol</th>
            <th className="px-6 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {initialUsers.map((user) => (
            <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.name.slice(0,2)}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{user.name}</div>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600">{user.email}</td>
              <td className="px-6 py-4">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {roleLabels[user.role] || user.role}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <select
                  defaultValue={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-white"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
