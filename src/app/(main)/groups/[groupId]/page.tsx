import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProcedureRuns, getTaskGroupById } from '@/actions/task-groups';
import { getTasksByGroup } from '@/actions/tasks';
import { getProcedureSteps } from '@/actions/procedure-steps';
import { getUsers } from '@/actions/users';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { ProcedureChecklist } from '@/components/tasks/ProcedureChecklist';
import { ProcedureTemplatePanel } from '@/components/tasks/ProcedureTemplatePanel';
import { frequencyLabels } from '@/components/tasks/task-table-utils';
import { ListChecks, Plus, X } from 'lucide-react';

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
  const canManage =
    currentUser.role === 'admin' || currentUser.role === 'editor';

  const group = await getTaskGroupById(groupId);
  if (!group) {
    notFound();
  }

  const isProcedure = group.kind === 'procedure';
  const isTemplate = isProcedure && group.isTemplate === true;
  const isRun = isProcedure && !isTemplate;

  const [tasks, steps, runs, users, template] = await Promise.all([
    isProcedure ? Promise.resolve([]) : getTasksByGroup(groupId),
    isProcedure ? getProcedureSteps(groupId) : Promise.resolve([]),
    isTemplate ? getProcedureRuns(groupId) : Promise.resolve([]),
    getUsers(),
    isRun && group.templateId
      ? getTaskGroupById(group.templateId)
      : Promise.resolve(null),
  ]);

  const completedSteps = steps.filter((s) => s.isCompleted).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {group.color && (
              <span
                className="w-1.5 h-8 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: group.color }}
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {group.name}
                </h1>
                {isTemplate && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <ListChecks className="w-3 h-3" />
                    Plantilla
                  </span>
                )}
                {isRun && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    Ejecución
                    {group.runStatus === 'completed' ? ' · Completada' : ' · Abierta'}
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  {group.description}
                </p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                {frequencyLabels[group.listType || 'one_time'] || group.listType}
                {group.dueDate ? ` · ${group.dueDate}` : ''}
                {isProcedure ? ` · ${completedSteps}/${steps.length} pasos` : ''}
              </p>
              {isRun && template && (
                <Link
                  href={`/groups/${template.id}`}
                  className="inline-block text-[11px] text-primary hover:underline mt-1"
                >
                  Ver plantilla: {template.name}
                </Link>
              )}
            </div>
          </div>
          <Link
            href={isRun && group.templateId ? `/groups/${group.templateId}` : '/groups'}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-slate-900 text-white text-xs md:text-sm font-semibold shadow-sm hover:bg-slate-800 shrink-0"
          >
            <span>{isRun ? 'Volver a plantilla' : 'Cerrar'}</span>
            <X className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {isTemplate ? (
        <ProcedureTemplatePanel
          template={group}
          steps={steps}
          runs={runs}
          users={users}
          canManage={canManage}
          currentUserId={currentUser.id}
        />
      ) : isRun ? (
        <section className="space-y-3">
          <p className="text-xs text-slate-500">
            Cada persona solo puede marcar los pasos que tiene asignados.
            Admin y editores pueden marcar cualquiera.
          </p>
          <ProcedureChecklist
            groupId={group.id}
            steps={steps}
            users={users}
            currentUser={
              currentUser.id
                ? { id: currentUser.id, role: currentUser.role }
                : undefined
            }
            canManage={canManage}
            readOnly={group.runStatus === 'completed'}
          />
        </section>
      ) : (
        <>
          <div className="flex items-center justify-end gap-3">
            <TaskFormDialog
              users={users}
              currentUser={currentUser}
              groupId={group.id}
              defaultAssignedUserId={group.supervisorUserId || undefined}
              defaultFrequency={group.listType || 'one_time'}
              defaultDeadline={group.dueDate || undefined}
              trigger={
                <button className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 text-sm font-semibold">
                  <Plus className="w-4 h-4" />
                  Nueva tarea en este grupo
                </button>
              }
            />
          </div>
          <section className="space-y-3">
            <p className="text-xs text-slate-500">
              Las tareas de este grupo no aparecen en la lista general. Usa este
              espacio como una carpeta o proyecto separado.
            </p>
            <TaskBoard
              tasks={tasks}
              users={users}
              currentUser={currentUser}
            />
          </section>
        </>
      )}
    </div>
  );
}
