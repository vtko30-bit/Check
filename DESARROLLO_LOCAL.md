# 🛠️ Guía de Desarrollo Local

Esta guía te ayudará a trabajar en tu proyecto localmente **sin afectar** lo que tienes desplegado en Vercel.

## 📋 Requisitos Previos

1. **Node.js** instalado (versión 18 o superior)
2. **Git** configurado
3. **Base de datos PostgreSQL** (local o remota separada)

## 🔧 Configuración Inicial

### 1. Clonar/Verificar el Repositorio

Si aún no tienes el código localmente:
```bash
git clone <tu-repositorio>
cd Check
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno Locales

**IMPORTANTE:** Usa `.env.local` para desarrollo local. Este archivo NO se subirá a Git.

```bash
# Copia el archivo de ejemplo
cp .env.example .env.local
```

Edita `.env.local` con tus valores locales:

```env
# Base de datos LOCAL (diferente a la de Vercel)
POSTGRES_URL="postgres://usuario:password@localhost:5432/check_local?sslmode=disable"

# Secreto para desarrollo local (diferente al de producción)
AUTH_SECRET="secreto-local-desarrollo-12345"
```

### 4. Configurar Base de Datos Local

#### Opción A: PostgreSQL Local

1. Instala PostgreSQL en tu máquina
2. Crea una base de datos:
   ```sql
   CREATE DATABASE check_local;
   ```
3. Usa la URL: `postgres://postgres:tu_password@localhost:5432/check_local`

#### Opción B: Base de Datos Remota Separada (Recomendado)

1. Crea una nueva base de datos en Vercel Postgres (o cualquier proveedor)
2. Usa esa URL en tu `.env.local`
3. **Ventaja:** No necesitas instalar PostgreSQL localmente

### 5. Inicializar la Base de Datos Local

Una vez configurado `.env.local`, ejecuta el seed:

```bash
npm run dev
```

Luego visita: `http://localhost:3000/api/seed`

> **Nota:** Si tienes `SEED_SECRET` en `.env.local`, debes enviar el header:
> `Authorization: Bearer <tu-SEED_SECRET>`. En desarrollo sin `SEED_SECRET` funciona sin autenticación.

Esto creará las tablas y el usuario demo:
- **Email:** `admin@check.com`
- **Password:** `123456`

> Si tu BD fue creada antes con la versión anterior, puedes usar `admin@taskpro.com` / `123456`.

## 🚀 Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción (prueba local)
npm run build

# Ejecutar versión de producción localmente
npm run build
npm start
```

## 🔒 Protección: Trabajar sin Afectar Vercel

### 1. Usar Ramas de Git

**NUNCA trabajes directamente en `main` o `master`:**

```bash
# Crear una rama para tus cambios
git checkout -b desarrollo-local

# Trabajar en esta rama
# ... hacer cambios ...

# Cuando estés listo, hacer merge a main
git checkout main
git merge desarrollo-local
git push origin main  # Esto desplegará a Vercel
```

### 2. Variables de Entorno Separadas

- **`.env.local`** → Solo para desarrollo local (NO se sube a Git)
- **Variables en Vercel** → Solo para producción

**Nunca subas `.env.local` a Git** (ya está en `.gitignore`)

### 3. Verificar Antes de Hacer Push

```bash
# Ver qué archivos se van a subir
git status

# Asegúrate de que NO aparece .env.local
```

## 📁 Estructura de Archivos de Entorno

```
.env.example          # Plantilla (se sube a Git)
.env.local            # Desarrollo local (NO se sube)
.env                  # Si existe, se usa en build (NO se sube)
```

## ⚠️ Checklist Antes de Desplegar a Vercel

Antes de hacer `git push` que despliegue a Vercel:

- [ ] Verificar que `.env.local` NO está en `git status`
- [ ] Probar que `npm run build` funciona sin errores
- [ ] Verificar que los cambios funcionan localmente
- [ ] Hacer commit solo de los archivos de código
- [ ] Las variables de entorno en Vercel están configuradas correctamente

## 🐛 Solución de Problemas

### API /api/cron no responde

**Causa:** El endpoint requiere `Authorization: Bearer <CRON_SECRET>`.

**Solución:** En Vercel → Settings → Environment Variables, añade `CRON_SECRET` (sin saltos de línea). Vercel lo envía automáticamente al cron definido en `vercel.json`. En local:
```bash
curl -H "Authorization: Bearer tu-CRON_SECRET" http://localhost:3000/api/cron
```

### Error: "missing_connection_string"

**Causa:** No hay `POSTGRES_URL` en `.env.local`

**Solución:** 
1. Verifica que `.env.local` existe
2. Verifica que tiene `POSTGRES_URL` configurado
3. Reinicia el servidor de desarrollo (`npm run dev`)

### Error: "Failed to fetch user"

**Causa:** La base de datos no está inicializada

**Solución:** Visita `http://localhost:3000/api/seed` para crear las tablas

### Los cambios no se reflejan

**Causa:** Caché de Next.js

**Solución:**
```bash
# Eliminar caché y reconstruir
rm -rf .next
npm run dev
```

## 📝 Notas Importantes

1. **`.env.local` tiene prioridad** sobre `.env` en desarrollo
2. **Vercel usa sus propias variables de entorno** configuradas en el dashboard
3. **Nunca compartas** tus archivos `.env.local` o `.env`
4. **Siempre usa ramas** para trabajar en nuevas funcionalidades

## 🔄 Flujo de Trabajo Recomendado

```
1. Crear rama: git checkout -b mi-nueva-funcionalidad
2. Trabajar localmente con .env.local
3. Probar cambios: npm run dev
4. Hacer commit: git commit -m "Descripción"
5. Hacer push de la rama: git push origin mi-nueva-funcionalidad
6. Crear Pull Request en GitHub/GitLab
7. Revisar y hacer merge
8. Vercel desplegará automáticamente desde main
```

---

**¿Necesitas ayuda?** Revisa los logs del servidor o los errores en la consola del navegador.
