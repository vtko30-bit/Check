import { z } from 'zod';

export const TASK_FREQUENCIES = [
  'one_time',
  'daily',
  'weekly',
  'weekly_0',
  'weekly_1',
  'weekly_2',
  'weekly_3',
  'weekly_4',
  'weekly_5',
  'weekly_6',
  'monday',
  'monthly',
  'date_range',
] as const;

export type TaskFrequency = (typeof TASK_FREQUENCIES)[number];

/** Opciones del selector de frecuencia (tareas y listas). */
export const TASK_FREQUENCY_OPTIONS: ReadonlyArray<{ value: TaskFrequency; label: string }> = [
  { value: 'one_time', label: 'Una vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal (mismo día que vencimiento)' },
  { value: 'weekly_0', label: 'Semanal - Domingos' },
  { value: 'weekly_1', label: 'Semanal - Lunes' },
  { value: 'weekly_2', label: 'Semanal - Martes' },
  { value: 'weekly_3', label: 'Semanal - Miércoles' },
  { value: 'weekly_4', label: 'Semanal - Jueves' },
  { value: 'weekly_5', label: 'Semanal - Viernes' },
  { value: 'weekly_6', label: 'Semanal - Sábados' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'date_range', label: 'Rango de Fechas' },
];

export const taskFormSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(80, 'El título no puede superar 80 caracteres'),
  description: z.string().max(2000).optional().default(''),
  assignedUserId: z.string().optional().nullable(),
  deadline: z.string().optional(),
  notes: z.string().optional().default(''),
  frequency: z.enum(TASK_FREQUENCIES).default('one_time'),
  startDate: z.string().optional(),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  groupId: z.string().uuid().optional().nullable(),
});

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export function parseTaskFormData(formData: FormData) {
  return taskFormSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    assignedUserId: formData.get('assignedUserId') || null,
    deadline: formData.get('deadline') || '',
    notes: formData.get('notes') ?? '',
    frequency: formData.get('frequency') || 'one_time',
    startDate: formData.get('startDate') || undefined,
    priority: formData.get('priority') || 'normal',
    groupId: formData.get('groupId') || null,
  });
}
