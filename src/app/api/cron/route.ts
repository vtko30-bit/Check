import { NextResponse } from 'next/server';
import { sendDailyReport } from '@/lib/email';
import { fetchAllTasksForReports, runCheckOverdueTasks } from '@/lib/task-reports';
import {
  notifyIncompleteProcedureRuns,
  runAutoStartProcedureRuns,
} from '@/lib/procedure-runs';
import { fetchAllUsers } from '@/lib/users-queries';
import { isBearerAuthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isBearerAuthorized(request, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const overdueResult = await runCheckOverdueTasks();
    if (!overdueResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: overdueResult.error ?? 'Error al comprobar tareas vencidas',
        },
        { status: 500 }
      );
    }

    const autoStart = await runAutoStartProcedureRuns();
    if (!autoStart.success) {
      return NextResponse.json(
        {
          success: false,
          error: autoStart.error ?? 'Error al autoiniciar procedimientos',
        },
        { status: 500 }
      );
    }

    const incomplete = await notifyIncompleteProcedureRuns();
    if (!incomplete.success) {
      return NextResponse.json(
        {
          success: false,
          error: incomplete.error ?? 'Error al notificar procedimientos incompletos',
        },
        { status: 500 }
      );
    }

    const tasks = await fetchAllTasksForReports();
    const users = await fetchAllUsers();

    const reportEmail =
      process.env.REPORT_EMAIL?.trim() ||
      users.find((u) => u.role === 'admin' && u.email)?.email;

    if (!reportEmail) {
      return NextResponse.json({
        success: true,
        warning: 'Sin REPORT_EMAIL ni admin con email; reporte no enviado.',
        overdueNotified: overdueResult.count ?? 0,
        proceduresStarted: autoStart.started,
        procedureAssigneesNotified: autoStart.notified,
        incompleteProcedureNotifications: incomplete.notified,
      });
    }

    const previewUrl = await sendDailyReport(reportEmail, tasks, users);

    return NextResponse.json({
      success: true,
      previewUrl,
      sentTo: reportEmail,
      overdueNotified: overdueResult.count ?? 0,
      proceduresStarted: autoStart.started,
      procedureAssigneesNotified: autoStart.notified,
      incompleteProcedureNotifications: incomplete.notified,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
