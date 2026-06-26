import { NextResponse } from 'next/server';
import { sendDailyReport } from '@/lib/email';
import { fetchAllTasksForReports, runCheckOverdueTasks } from '@/lib/task-reports';
import { fetchAllUsers } from '@/lib/users-queries';
import { isBearerAuthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isBearerAuthorized(request, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    await runCheckOverdueTasks();
    const tasks = await fetchAllTasksForReports();
    const users = await fetchAllUsers();

    const previewUrl = await sendDailyReport('admin@example.com', tasks, users);

    return NextResponse.json({ success: true, previewUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
