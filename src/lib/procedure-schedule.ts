/**
 * Decide si una plantilla de procedimiento debe generar ejecución en `today` (YYYY-MM-DD).
 * Alineado con la lógica de recurrencia del calendario de tareas.
 */
export function shouldAutoStartProcedureToday(
  listType: string | null | undefined,
  dueDate: string | null | undefined,
  today: string
): boolean {
  const frequency = listType || 'one_time';

  if (frequency === 'date_range') {
    if (!dueDate) return true;
    return today <= dueDate;
  }

  if (!dueDate) {
    return frequency === 'daily' || frequency === 'permanent';
  }

  if (frequency !== 'date_range' && today < dueDate) {
    return false;
  }

  if (frequency === 'one_time') {
    return today === dueDate;
  }

  if (frequency === 'daily' || frequency === 'permanent') {
    return true;
  }

  const todayDate = parseLocalDate(today);
  const due = parseLocalDate(dueDate);
  if (!todayDate || !due) return false;

  const dayOfWeek = todayDate.getDay();

  if (frequency === 'weekly') {
    return dayOfWeek === due.getDay();
  }

  const weeklyMatch = frequency.match(/^weekly_(\d)$/);
  if (weeklyMatch) {
    return dayOfWeek === parseInt(weeklyMatch[1], 10);
  }

  if (frequency === 'monday') {
    return dayOfWeek === 1;
  }

  if (frequency === 'monthly') {
    return todayDate.getDate() === due.getDate();
  }

  return false;
}

function parseLocalDate(isoDate: string): Date | null {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
