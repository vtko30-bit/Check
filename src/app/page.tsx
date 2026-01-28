import { getTasks, checkOverdueTasks } from '@/actions/tasks';
import { getUsers } from '@/actions/users';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { SendReportButton } from '@/components/SendReportButton';
import { StickyNote } from '@/components/tasks/StickyNote';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const session = await auth();
  const currentUser = session?.user;
  
  // Trigger overdue notification logic
  await checkOverdueTasks();
  
  const tasks = await getTasks(true);
  const users = await getUsers();

  const pinnedTasks = tasks.filter(t => t.isPinned && !t.isArchived);

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Mis Tareas</h1>
        <div className="flex items-center gap-2">
            <SendReportButton />
            <TaskFormDialog users={users} currentUser={currentUser} />
        </div>
      </div>

      {/* Sticky Board Section */}
      {pinnedTasks.length > 0 && (
        <div className="mb-12">
          <h2 className="text-lg font-medium text-slate-500 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Tablero de Notas (Post-its)
          </h2>
          <div className="flex flex-wrap gap-8 justify-start">
            {pinnedTasks.map(task => (
              <StickyNote key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      <TaskTable tasks={tasks} users={users} currentUser={currentUser} />
    </div>
  );
}
