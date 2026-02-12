import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.SEED_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed deshabilitado en producción' }, { status: 403 });
  }
  try {
    // START TRANSACTION (Implicit in Vercel Postgres for single query blocks, but treating sequentially here)

    // 1. Create Users Table (If not exists, or alter if needed - simpler to assume iterative add column in production migrations, but for this demo restarting or IF NOT EXISTS is fine. 
    // Ideally we would use proper migrations. Here we will try to ADD COLUMN if it's missing by catching error or checking schema, but since users table exists, let's just create if not exists first.)
    
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        password VARCHAR(255)
      );
    `;

    // Try to add password column if it doesn't exist (for existing tables)
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)`;
    } catch (e) {
        console.log("Column password might already exist or error adding it:", e);
    }
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    } catch (e) {
        console.log("Column is_active might already exist:", e);
    }
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_all_tasks BOOLEAN DEFAULT FALSE`;
    } catch (e) {
        console.log("Column can_view_all_tasks might already exist:", e);
    }

    // Tabla para tokens de recuperación de contraseña
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 2. Create Task Groups Table (para agrupar tareas en "carpetas" o proyectos)
    await sql`
      CREATE TABLE IF NOT EXISTS task_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(20),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 3. Create Tasks Table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_user_id UUID REFERENCES users(id),
        deadline DATE,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        subtasks JSONB DEFAULT '[]',
        frequency VARCHAR(50) DEFAULT 'one_time',
        priority VARCHAR(20) DEFAULT 'normal',
        is_archived BOOLEAN DEFAULT FALSE,
        is_pinned BOOLEAN DEFAULT FALSE,
        group_id UUID REFERENCES task_groups(id)
      );
    `;

    // 4. Create Notifications Table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 5. Create Settings Table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Migrations for existing tables
    try {
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'one_time'`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS overdue_notified BOOLEAN DEFAULT FALSE`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE`;
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES task_groups(id)`;
    } catch (e) {
        console.log("Error adding columns to tasks:", e);
    }

    // 3. Seed initial admin user if not exists
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Usuario demo de Check (compatible con BDs antiguas que usen admin@taskpro.com)
    const demoEmail = 'admin@check.com';
    const adminExists = await sql`SELECT * FROM users WHERE email = ${demoEmail}`;
    if (adminExists.rowCount === 0) {
      await sql`
        INSERT INTO users (name, email, role, avatar_url, password, can_view_all_tasks)
        VALUES ('Admin', ${demoEmail}, 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', ${hashedPassword}, TRUE)
      `;
    } else {
        await sql`UPDATE users SET password = ${hashedPassword}, can_view_all_tasks = TRUE WHERE email = ${demoEmail}`;
    }

    return NextResponse.json({ success: true, message: 'Database seeded/updated successfully for Auth' });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
