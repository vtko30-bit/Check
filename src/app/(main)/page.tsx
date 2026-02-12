import { ProductivityStats } from '@/components/tasks/ProductivityStats';
import { getTasks } from '@/actions/tasks';
import { getUsers } from '@/actions/users';
import { getTaskGroups } from '@/actions/task-groups';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskViewToggle } from '@/components/tasks/TaskViewToggle';
import { auth } from '@/auth';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  const currentUser = session?.user;
  const params = await searchParams;
  const viewMode = params?.view === 'mine' ? 'mine' : 'all';
  const tasks = await getTasks(true, viewMode);
  const users = await getUsers();
  const groups = await getTaskGroups();

  return (
    <div className="w-full pb-24 px-4 md:px-8 relative min-h-screen">
      
      {/* Título */}
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
        {viewMode === 'mine' ? 'Mis Tareas' : 'Todas las Tareas'}
      </h1>

      {/* Banda resumen (ancho reducido) + botones Todas / Solo mías a la derecha */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="max-w-md w-full md:max-w-sm md:w-auto">
          <ProductivityStats tasks={tasks} />
        </div>
        <div className="ml-auto">
          <TaskViewToggle 
            currentView={viewMode} 
            canToggle={(currentUser as { canViewAllTasks?: boolean })?.canViewAllTasks === true} 
          />
        </div>
      </div>

      {/* Tabla de Tareas */}
      <TaskTable tasks={tasks} users={users} currentUser={currentUser} groups={groups} />

      {/* --- BOTÓN FLOTANTE (NUEVA TAREA CON TEXTO) --- */}
      <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50">
        <TaskFormDialog 
            users={users} 
            currentUser={currentUser}
            trigger={
                <button 
                  className="h-14 px-6 bg-primary text-white rounded-full shadow-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
                >
                    <Plus className="h-6 w-6 stroke-[3px]" />
                    <span className="font-bold text-base whitespace-nowrap">Nueva Tarea</span>
                </button>
            }
        />
      </div>

    </div>
  );
}