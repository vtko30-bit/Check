'use client';

import { useState, type FormEvent } from 'react';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { updateUser, setUserActive } from '@/actions/users';
import { toast } from 'sonner';
import { UserX, UserCheck, KeyRound } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Super Admin',
  editor: 'Administrador',
  viewer: 'Usuario',
};

interface UserDetailModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onSaveAndClose?: () => void;
  currentUserRole?: string;
}

export function UserDetailModal({ user, open, onClose, onSaved, onSaveAndClose, currentUserRole }: UserDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'viewer', canViewAllTasks: false, newPassword: '' });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const isSuperAdmin = currentUserRole === 'admin';

  if (!user) return null;

  const isActive = user.isActive !== false;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditing(false);
      setError(null);
      setFormData({ name: user.name, email: user.email, role: user.role, canViewAllTasks: user.canViewAllTasks ?? false, newPassword: '' });
      onClose();
    }
  };

  const initForm = () => {
    setFormData({ name: user.name, email: user.email, role: user.role, canViewAllTasks: user.canViewAllTasks ?? false, newPassword: '' });
    setEditing(true);
    setError(null);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setFormData((p) => ({ ...p, newPassword: pwd }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await updateUser(user.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        canViewAllTasks: formData.canViewAllTasks,
        newPassword: formData.newPassword || undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'Error al guardar');
        return;
      }
      toast.success('Usuario actualizado correctamente');
      const closeFn = onSaveAndClose ?? (() => { onSaved?.(); onClose(); });
      setTimeout(closeFn, 0);
    } finally {
      setLoading(false);
    }
  }

  async function executeToggleActive() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await setUserActive(user.id, !isActive);
      if (!result.success) {
        setError(result.error ?? 'Error al cambiar estado');
        toast.error(result.error);
        return;
      }
      toast.success(isActive ? 'Usuario desactivado' : 'Usuario reactivado');
      onSaved?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-white">
        <DialogHeader>
          <DialogTitle>Detalle del usuario</DialogTitle>
        </DialogHeader>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                required
              />
              <p className="text-[10px] text-slate-500">Correo real para recuperación de contraseña.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Rol</Label>
              <select
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="admin">Super Admin</option>
                <option value="editor">Administrador</option>
                <option value="viewer">Usuario</option>
              </select>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <input
                type="checkbox"
                id="edit-canViewAllTasks"
                checked={formData.canViewAllTasks}
                onChange={(e) => setFormData((p) => ({ ...p, canViewAllTasks: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="edit-canViewAllTasks" className="text-sm font-medium cursor-pointer flex-1">
                Puede ver todas las tareas
              </Label>
            </div>
            {isSuperAdmin && (
              <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Nueva contraseña (opcional)
                </Label>
                <p className="text-[10px] text-slate-500">Solo Super Admin puede establecer o cambiar la contraseña. Las contraseñas se guardan cifradas y no se pueden recuperar.</p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.newPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Dejar vacío para no cambiar"
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                    Generar
                  </Button>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</p>
                <p className="font-medium text-slate-900">{user.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</p>
                <p className="font-medium text-slate-900">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rol</p>
                <p className="font-medium text-slate-900">{roleLabels[user.role] || user.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Puede ver todas las tareas</p>
                <p className="font-medium text-slate-900">{user.canViewAllTasks ? 'Sí' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</p>
                <p className={isActive ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
                  {isActive ? 'Activo' : 'Desactivado'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={initForm} variant="outline" className="w-full">
                Editar información
              </Button>
              <div
                onClick={() => !loading && setShowConfirmDialog(true)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  loading && "opacity-60 pointer-events-none",
                  isActive
                    ? "border-rose-200 bg-rose-50/50 hover:bg-rose-100"
                    : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
                )}
              >
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  isActive ? "border-rose-400 bg-white" : "border-emerald-400 bg-white"
                )}>
                  {isActive ? <UserX className="w-3 h-3 text-rose-500" /> : <UserCheck className="w-3 h-3 text-emerald-600" />}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  isActive ? "text-rose-700" : "text-emerald-700"
                )}>
                  {isActive ? 'Desactivar usuario' : 'Reactivar usuario'}
                </span>
              </div>
            </div>

            {/* Diálogo de confirmación */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogContent className="sm:max-w-[400px] bg-white">
                <DialogHeader>
                  <DialogTitle className={isActive ? 'text-rose-700' : 'text-emerald-700'}>
                    {isActive ? '¿Desactivar usuario?' : '¿Reactivar usuario?'}
                  </DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <p className="text-sm text-slate-600">
                    {isActive ? (
                      <>
                        <strong>Advertencia:</strong> Al desactivar a <strong>{user.name}</strong>, no podrá iniciar sesión hasta que lo reactives. ¿Deseas continuar?
                      </>
                    ) : (
                      <>¿Deseas reactivar a <strong>{user.name}</strong>? Podrá iniciar sesión nuevamente.</>
                    )}
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      setShowConfirmDialog(false);
                      await executeToggleActive();
                    }}
                    disabled={loading}
                    className={isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                  >
                    {loading ? 'Procesando...' : (isActive ? 'Sí, desactivar' : 'Sí, reactivar')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
