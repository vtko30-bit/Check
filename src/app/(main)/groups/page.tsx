import { auth } from '@/auth';
import { getTaskGroups } from '@/actions/task-groups';
import { TaskGroupsManager } from '@/components/tasks/TaskGroupsManager';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const session = await auth();
  const currentUser = session?.user as { role?: string } | null;
  const groups = await getTaskGroups();

  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'editor';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-2">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
          Tareas Agrupadas
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Crea carpetas o proyectos para agrupar tareas y mantener separadas
          las listas principales.
        </p>
      </header>

      <TaskGroupsManager groups={groups} canManage={!!canManage} />
    </div>
  );
}

