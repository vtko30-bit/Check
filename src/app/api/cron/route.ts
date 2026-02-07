import { NextResponse } from 'next/server';
import { sendDailyReport } from '@/lib/email';
import { getAllTasksForReports, checkOverdueTasks } from '@/actions/tasks';
import { getUsers } from '@/actions/users';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    await checkOverdueTasks();
    const tasks = await getAllTasksForReports();
    const users = await getUsers();
    
    // In a real app, you might iterate over users and send individual reports.
    // Here we send one admin report to a fixed address.
    const previewUrl = await sendDailyReport('admin@example.com', tasks, users);
    
    return NextResponse.json({ success: true, previewUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
