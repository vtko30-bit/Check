import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'editor', 'viewer']),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  canViewAllTasks: z.union([z.boolean(), z.literal('on'), z.string()]).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
