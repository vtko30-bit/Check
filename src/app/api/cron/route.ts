import { NextResponse } from 'next/server';
import { sendDailyReport } from '@/lib/email';
import { getTasks } from '@/actions/tasks';
import { getUsers } from '@/actions/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await getTasks();
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
