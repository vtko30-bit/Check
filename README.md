# Check - Gestión de Tareas

Aplicación de gestión de tareas moderna construida con Next.js 16, TypeScript y PostgreSQL.

## 🚀 Inicio Rápido

### Desarrollo Local

**⚠️ IMPORTANTE:** Para trabajar localmente sin afectar Vercel, lee la [Guía de Desarrollo Local](./DESARROLLO_LOCAL.md)

Pasos rápidos:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.local.example .env.local
   # Edita .env.local con tus credenciales locales
   ```

3. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Inicializar base de datos:**
   - Abre: http://localhost:3000/api/seed
   - Credenciales demo: `admin@check.com` / `123456`

5. **Abrir aplicación:**
   - http://localhost:3000

## 📋 Características

- ✅ Gestión de tareas con subtareas
- 📅 Vista de calendario
- 👥 Gestión de usuarios con roles (admin, editor, viewer)
- 🔔 Sistema de notificaciones
- 📊 Estadísticas de productividad
- 🎨 Interfaz moderna y responsive

## 🛠️ Tecnologías

- **Framework:** Next.js 16 (App Router)
- **Base de datos:** PostgreSQL (Vercel Postgres)
- **Autenticación:** NextAuth v5
- **Estilos:** Tailwind CSS + Radix UI
- **TypeScript:** Para type safety

## 📚 Documentación

- **[Guía de Desarrollo Local](./DESARROLLO_LOCAL.md)** - Trabajar localmente sin afectar producción
- **[Variables de Entorno](./.env.example)** - Configuración requerida

## 🔒 Seguridad

- Las variables de entorno locales (`.env.local`) **NO se suben a Git**
- Usa ramas separadas para desarrollo
- Verifica cambios antes de hacer push a producción

## 📦 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Compilar para producción
npm run start    # Ejecutar versión de producción
npm run lint     # Verificar código
```

## 🌐 Despliegue en Vercel

El proyecto está configurado para desplegarse automáticamente en Vercel cuando haces push a la rama principal.

**Variables de entorno en Vercel:**
- `POSTGRES_URL` - URL de conexión a PostgreSQL
- `AUTH_SECRET` - Secreto para NextAuth

## 📝 Notas

- El proyecto usa **Vercel Postgres** pero puede funcionar con cualquier PostgreSQL
- Las variables de entorno en Vercel son independientes de las locales
- Siempre trabaja en ramas separadas antes de hacer merge a producción
