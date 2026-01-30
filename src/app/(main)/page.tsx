import { ProductivityStats } from '@/components/tasks/ProductivityStats';
import { getTasks, checkOverdueTasks } from '@/actions/tasks';
import { getUsers } from '@/actions/users';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { SendReportButton } from '@/components/SendReportButton';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const session = await auth();
  const currentUser = session?.user;
  
  // Trigger overdue notification logic
  await checkOverdueTasks();
  
  const tasks = await getTasks(true);
  const users = await getUsers();

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-bold">Mis Tareas</h1>
        
        {/* Botones de acción */}
        <div className="flex items-center gap-2">
            <SendReportButton />
            <TaskFormDialog users={users} currentUser={currentUser} />
        </div>
      </div>

      {/* Dashboard de Productividad (Lo mantenemos porque es útil) */}
      <ProductivityStats tasks={tasks} />

      {/* AQUÍ ELIMINAMOS EL BLOQUE DE STICKY NOTES */}
      
      {/* Tabla de Tareas */}
      <TaskTable tasks={tasks} users={users} currentUser={currentUser} />
    </div>
  );
}