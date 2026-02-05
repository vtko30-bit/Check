import nodemailer from 'nodemailer';
import { Task, User } from '@/types';

// For demo purposes, we'll use Ethereal (fake SMTP) if no environment variables are present.
// In production, you'd use process.env.SMTP_HOST, etc.

export async function sendDailyReport(to: string, tasks: Task[], users: User[]) {
  const account = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const criticalTasks = pendingTasks.filter(t => {
      // Logic for critical dates (same as TaskTable)
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
          ${criticalTasks.map(t => {
            const user = users.find(u => u.id === t.assignedUserId);
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${t.title}</td>
                <td style="padding: 10px;">${user?.name || 'Sin asignar'}</td>
                <td style="padding: 10px; color: red;">${new Date(t.deadline).toLocaleDateString()}</td>
              </tr>
            `;
          }).join('')}
        </table>
      `}
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        Este es un mensaje automático de <strong>Check</strong>.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: '"Check Bot" <noreply@check.local>',
    to,
    subject: `📋 Reporte Diario - ${new Date().toLocaleDateString()}`,
    html,
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  
  return nodemailer.getTestMessageUrl(info);
}
