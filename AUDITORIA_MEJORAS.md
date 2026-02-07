# 🔍 Auditoría de la App Check

Informe de auditoría con hallazgos y recomendaciones de mejora.

---

## 🔴 CRÍTICO – Seguridad

### 1. API `/api/seed` sin protección
**Problema:** Cualquiera puede llamar a `GET /api/seed` y modificar la base de datos (crear tablas, insertar usuarios).

**Recomendación:** Proteger con un secreto o deshabilitar en producción:
```typescript
// En route.ts
const CRON_SECRET = process.env.CRON_SECRET;
if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// O deshabilitar si process.env.NODE_ENV === 'production'
```

### 2. API `/api/cron` sin autenticación
**Problema:** Cualquiera puede ejecutar el reporte diario y enviar correos.

**Recomendación:** Usar el header `Authorization: Bearer <CRON_SECRET>` que Vercel Cron envía automáticamente, o verificar `CRON_SECRET`.

### 3. Crear usuarios sin verificar rol admin
**Problema:** Cualquier usuario autenticado puede crear usuarios (incluidos admins) desde `/users`.

**Recomendación:** En `createUser` (users.ts), comprobar que el usuario actual sea admin:
```typescript
const session = await auth();
if ((session?.user as any)?.role !== 'admin') {
  return { success: false, error: 'No autorizado' };
}
```

### 4. Acceso a `/users` sin restricción de rol
**Problema:** La página de usuarios está visible para todos. Solo Configuración está limitada a admins.

**Recomendación:** Ocultar el enlace "Usuarios" en el Sidebar para roles distintos de admin, y proteger la ruta en el layout o middleware.

### 5. IDOR en tareas (Insecure Direct Object Reference)
**Problema:** `archiveTask`, `deleteTask`, `updateTask`, `updateTaskStatus`, etc. no comprueban que la tarea pertenezca al usuario o que sea admin.

**Recomendación:** Antes de modificar/eliminar, verificar:
- Si es admin → permitir.
- Si no es admin → solo si `assigned_user_id === session.user.id`.

### 6. Notificaciones sin verificación de propietario
**Problema:** `markAsRead(notificationId)` no comprueba que la notificación sea del usuario actual.

**Recomendación:** Añadir `WHERE user_id = ${userId}` en el UPDATE y pasar `userId` desde la sesión.

---

## 🟠 IMPORTANTE – Validación y robustez

### 7. Validación de formularios en Server Actions
**Problema:** `createTask`, `updateTask`, `createUser` usan `formData.get()` sin validar (título vacío, fechas inválidas, etc.).

**Recomendación:** Usar Zod (ya está en el proyecto) para validar:
```typescript
const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  email: z.string().email(),
  // ...
});
```

### 8. IDs de subtareas con `Math.random()`
**Problema:** `Math.random().toString(36).substring(2, 9)` no es adecuado para IDs únicos.

**Recomendación:** Usar `crypto.randomUUID()` o `nanoid`.

### 9. `updateBranding` sin verificación de admin
**Problema:** No se comprueba que quien actualiza el logo sea admin.

**Recomendación:** Añadir verificación de sesión y rol admin antes de actualizar.

---

## 🟡 MEJORAS – Arquitectura y rendimiento

### 10. `checkOverdueTasks()` en cada carga del dashboard
**Problema:** Se ejecuta en cada visita a `/`, lo que puede ralentizar la página.

**Recomendación:** Mover a un cron (por ejemplo Vercel Cron) o a un job en background, no en el render de la página.

### 11. Prisma vs SQL directo
**Problema:** Existe `prisma/schema.prisma` con `DATABASE_URL`, pero la app usa `@vercel/postgres` con `POSTGRES_URL` y SQL directo. El schema está desfasado.

**Recomendación:** Decidir una estrategia: o migrar a Prisma, o eliminar el schema y documentar que se usa SQL directo.

### 12. Email con Ethereal en producción
**Problema:** `email.ts` usa `nodemailer.createTestAccount()` siempre, generando cuentas de prueba en cada envío.

**Recomendación:** Usar variables de entorno (SMTP_HOST, SMTP_USER, etc.) en producción y Ethereal solo en desarrollo.

### 13. Logs de auth en producción
**Problema:** `auth.config.ts` hace `console.log` en cada request (path, loggedIn, etc.).

**Recomendación:** Quitar los logs o usar un logger condicionado a `NODE_ENV !== 'production'`.

---

## 🟢 UX y detalles

### 14. Uso de `alert()` para errores
**Problema:** En `TaskBoard.tsx` se usa `alert(result.error)` para mostrar errores.

**Recomendación:** Usar un sistema de toasts (por ejemplo `sonner` o `react-hot-toast`).

### 15. Warning de Recharts
**Problema:** "The width(-1) and height(-1) of chart should be greater than 0" en `ProductivityStats`.

**Recomendación:** Dar dimensiones explícitas al contenedor del gráfico o usar `minWidth`/`minHeight` en el `ResponsiveContainer`.

### 16. Middleware deprecado
**Problema:** Next.js avisa que "middleware" está deprecado en favor de "proxy".

**Recomendación:** Revisar la documentación de Next.js 16 para migrar a la nueva convención cuando esté estable.

---

## 📋 Resumen de prioridades

| Prioridad | Cantidad | Acción sugerida |
|-----------|----------|-----------------|
| 🔴 Crítico | 6 | Corregir antes de producción |
| 🟠 Importante | 3 | Corregir pronto |
| 🟡 Mejora | 4 | Planificar en sprints |
| 🟢 Detalle | 3 | Mejoras incrementales |

---

## ✅ Puntos positivos

- Uso correcto de Server Actions con `'use server'`
- Autenticación con NextAuth v5 y bcrypt
- Queries parametrizadas (evitan SQL injection)
- Estructura de carpetas clara
- Uso de `revalidatePath` tras mutaciones
- Validación de credenciales con Zod en el login
- Separación de roles (admin/editor/viewer) en la UI

---

*Auditoría realizada el 5 de febrero de 2025*

---

## ✅ Correcciones implementadas (5 feb 2025)

- [x] Protección de `/api/seed` con SEED_SECRET y deshabilitado en producción
- [x] Protección de `/api/cron` con CRON_SECRET
- [x] Verificación de rol admin en `createUser`, `updateUserRole`, `updateBranding`
- [x] Restricción de `/users` y enlace en Sidebar/MobileNav solo para admins
- [x] Checks de ownership en todas las acciones de tareas (canModifyTask)
- [x] Verificación de propietario en `markAsRead` de notificaciones
- [x] Validación Zod en `createTask`, `updateTask`, `createUser`
- [x] IDs de subtareas con `crypto.randomUUID()` en lugar de Math.random
- [x] Email: uso de SMTP env vars en producción, Ethereal en desarrollo
- [x] Logs de auth solo en desarrollo
- [x] `checkOverdueTasks` movido al cron, eliminado del dashboard
- [x] Toast (sonner) en lugar de alert en TaskBoard
- [x] Fix Recharts: minWidth/minHeight en ResponsiveContainer
- [x] Manejo de errores en TaskFormDialog con estado y mensaje visual
