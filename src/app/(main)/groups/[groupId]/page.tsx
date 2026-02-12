import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTaskGroupById } from '@/actions/task-groups';
import { getTasksByGroup } from '@/actions/tasks';
import { getUsers } from '@/actions/users';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { Plus, X } from 'lucide-react';

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function GroupDetailPage({ params }: GroupPageProps) {
  const { groupId } = await params;

  const session = await auth();
  if (!session?.user) {
    notFound();
  }
  const currentUser = session.user;

  const [group, tasks, users] = await Promise.all([
    getTaskGroupById(groupId),
    getTasksByGroup(groupId),
    getUsers(),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {group.color && (
            <span
              className="w-1.5 h-8 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          )}
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {group.description}
            </p>
          )}
        </div>
      </header>

      <div className="flex items-center justify-end gap-3">
        <TaskFormDialog
          users={users}
          currentUser={currentUser as any}
          groupId={group.id}
          trigger={
            <button className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Nueva tarea en este grupo
            </button>
          }
        />
        <Link
          href="/groups"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-slate-900 text-white text-xs md:text-sm font-semibold shadow-sm hover:bg-slate-800"
        >
          <span>Cerrar</span>
          <X className="w-3.5 h-3.5" />
        </Link>
      </div>

      <section className="space-y-3">
        <p className="text-xs text-slate-500">
          Las tareas de este grupo no aparecen en la lista general. Usa este
          espacio como una carpeta o proyecto separado.
        </p>
        <TaskBoard
          tasks={tasks}
          users={users}
          currentUser={currentUser as any}
        />
      </section>
    </div>
  );
}

