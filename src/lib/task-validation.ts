import { z } from 'zod';

export const taskFormSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(80, 'El título no puede superar 80 caracteres'),
  description: z.string().max(2000).optional().default(''),
  assignedUserId: z.string().optional().nullable(),
  deadline: z.string().optional(),
  notes: z.string().optional().default(''),
  frequency: z
    .enum([
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
    ])
    .default('one_time'),
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
