import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Task, User } from '@/types';

type MailTransporter = {
  transporter: nodemailer.Transporter;
  isTestAccount: boolean;
};

function getFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim();
  if (from) return from;
  const user = process.env.SMTP_USER?.trim();
  if (user) return `"Check" <${user}>`;
  return '"Check" <noreply@check.local>';
}

function getSmtpOptions(): SMTPTransport.Options | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  };
}

async function createMailTransporter(): Promise<MailTransporter> {
  const smtp = getSmtpOptions();
  if (smtp) {
    return {
      transporter: nodemailer.createTransport(smtp),
      isTestAccount: false,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SMTP no configurado en producción. Añade SMTP_HOST, SMTP_USER y SMTP_PASS en Vercel.'
    );
  }

  const account = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    }),
    isTestAccount: true,
  };
}

export async function sendDailyReport(to: string, tasks: Task[], users: User[]) {
  const { transporter, isTestAccount } = await createMailTransporter();

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const criticalTasks = pendingTasks.filter((t) => {
    const d = new Date(t.deadline);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4f46e5;">Reporte Diario de Tareas</h1>
      <p>Hola, aquí tienes el resumen de hoy:</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin-top: 0;">Resumen</h2>
        <ul style="list-style: none; padding: 0;">
          <li>📝 <strong>Pendientes Totales:</strong> ${pendingTasks.length}</li>
          <li>🚨 <strong>Urgentes (Vencen hoy/mañana):</strong> ${criticalTasks.length}</li>
        </ul>
      </div>

      <h3>Tareas Urgentes</h3>
      ${criticalTasks.length === 0 ? '<p style="color: green;">No hay tareas urgentes. ¡Buen trabajo!</p>' : `
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #eee; text-align: left;">
            <th style="padding: 10px;">Tarea</th>
            <th style="padding: 10px;">Responsable</th>
            <th style="padding: 10px;">Vencimiento</th>
          </tr>
          ${criticalTasks
            .map((t) => {
              const user = users.find((u) => u.id === t.assignedUserId);
              return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${t.title}</td>
                <td style="padding: 10px;">${user?.name || 'Sin asignar'}</td>
                <td style="padding: 10px; color: red;">${new Date(t.deadline).toLocaleDateString()}</td>
              </tr>
            `;
            })
            .join('')}
        </table>
      `}
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        Este es un mensaje automático de <strong>Check</strong>.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: `📋 Reporte Diario - ${new Date().toLocaleDateString('es-CL')}`,
    html,
  });

  if (isTestAccount) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl && process.env.NODE_ENV === 'development') {
      console.log('Preview URL:', previewUrl);
    }
    return previewUrl || null;
  }

  return null;
}

export async function sendPasswordResetEmail(to: string, resetLink: string, userName?: string) {
  const { transporter, isTestAccount } = await createMailTransporter();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #14b8a6;">Recuperar contraseña - Check</h1>
      <p>Hola${userName ? ` ${userName}` : ''},</p>
      <p>Recibiste este correo porque solicitaste recuperar tu contraseña.</p>
      <p>
        <a href="${resetLink}" style="display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Restablecer contraseña
        </a>
      </p>
      <p>Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        Mensaje automático de <strong>Check</strong>.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: 'Recuperar contraseña - Check',
    html,
  });

  if (isTestAccount && process.env.NODE_ENV === 'development') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Password reset preview:', previewUrl);
  }
}
