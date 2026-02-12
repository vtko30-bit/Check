# Apuntes de la conversación – Check

Resumen de lo trabajado en el proyecto para tener como referencia.

---

## 1. Error "Failed to create task"

**Problema:** La columna `start_date` no existía en la base de datos.

**Solución:**
- Se añadió fallback en `createTask`: si falla el INSERT, se ejecuta `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE` y se reintenta.
- Endpoint de depuración temporal: `/api/debug-task-create` (aplica la migración automáticamente).
- En producción: ejecutar `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE` en la consola SQL de Vercel, o llamar al endpoint con `DB_CHECK_SECRET`.

---

## 2. Variables de entorno en Vercel

**Faltaba:** `DB_CHECK_SECRET` – necesario para el endpoint de depuración.

**Generar secreto (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

**Añadir en Vercel:** Settings → Environment Variables → KEY: `DB_CHECK_SECRET`, VALUE: (el secreto generado).

---

## 3. Sincronizar base de datos Vercel → Local

**Script:** `scripts/sync-db-from-vercel.mjs`

**Pasos:**
1. Crear `.env.vercel` con: `POSTGRES_URL_VERCEL="url-de-vercel"`
2. Obtener la URL en: Vercel → Storage → tu base de datos → Connection string
3. Ejecutar: `node scripts/sync-db-from-vercel.mjs`

---

## 4. Cambios de UI realizados

- **Checklist:** indicador con icono y progreso (ej. 2/5) al lado del nombre de la tarea.
- **Avatares:** se quitaron de tareas, sidebar y menú móvil.
- **Subtareas:** no se permiten duplicados (validación por nombre).
- **Frecuencia:** se puede elegir el día (Domingos, Lunes, Martes, etc.) en lugar de solo "Todos los Lunes".
- **Icono PWA:** usa `check-logo.png` en lugar del icono por defecto.
- **Botón Compartir:** en sidebar y móvil; usa Web Share API o copia el enlace.

---

## 5. Desplegar en Vercel

**Importante:** Vercel despliega desde la rama `main`, pero el trabajo local suele estar en `master`.

**Comandos:**
```powershell
git add .
git commit -m "Descripción"
git push origin master
git push origin master:main   # ← Necesario para que Vercel actualice
```

**Alternativa:** Cambiar en Vercel → Settings → Git → Production Branch a `master`.

---

## 6. Guardar respaldo en GitHub

**Rama de respaldo:**
```powershell
git branch backup-2025-02-07
git push origin backup-2025-02-07
```

**Tag de versión:**
```powershell
git tag -a v1.0 -m "Versión estable"
git push origin v1.0
```

---

## 7. Credenciales de GitHub

- `https://github.com/vtko30-bit/Check.git` **NO** es una credencial, es la URL del repositorio.
- Para `git push` se usa un **Personal Access Token (classic)** como contraseña.
- Crear en: GitHub → Settings → Developer settings → Personal access tokens.
- **Nunca compartir** el token en chats o sitios públicos.

---

## 8. Compartir la app

- **URL:** https://check-one-omega.vercel.app
- Botón "Compartir app" en la barra lateral y menú móvil.
- En móvil: usa el menú nativo de compartir; en desktop: copia el enlace.

---

## 9. Archivos modificados (resumen)

- `src/actions/tasks.ts` – fallback `start_date`, deduplicar subtareas, frecuencias por día
- `src/components/Sidebar.tsx` – sin avatar, botón compartir
- `src/components/MobileNav.tsx` – sin avatar, botón compartir
- `src/components/ShareButton.tsx` – nuevo componente
- `src/components/tasks/TaskTable.tsx` – checklist, sin avatar, indicador
- `src/components/tasks/TaskBoard.tsx` – checklist, sin avatar
- `src/components/tasks/CalendarView.tsx` – checklist, frecuencias
- `src/components/tasks/TaskFormDialog.tsx` – frecuencias por día, validación subtareas
- `src/app/manifest.ts` – icono Check, nombre
- `src/app/layout.tsx` – iconos metadata
- `scripts/sync-db-from-vercel.mjs` – script de sincronización
- `src/app/api/debug-task-create/` – endpoint temporal de depuración
