import { getTasks } from '@/actions/tasks';
import { CalendarView } from '@/components/tasks/CalendarView';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const tasks = await getTasks();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendario</h1>
      </div>
      <CalendarView tasks={tasks} />
    </div>
  );
}
