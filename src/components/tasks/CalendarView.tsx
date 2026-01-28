'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { formatMonthYear } from '@/lib/date';
import { TaskDetailModal } from './TaskDetailModal';

interface CalendarViewProps {
  tasks: Task[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const monthLabel = formatMonthYear(currentDate);
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const getStatusColor = (status: string) => {
      switch(status) {
          case 'completed': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
          case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
          default: return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-800 w-48">{monthLabelCapitalized}</h2>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={today}>
                    Hoy
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b bg-slate-50">
        {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
          <div key={d} className="py-2 text-sm font-medium text-center text-slate-500 uppercase tracking-wider hidden md:block">{d}</div>
        ))}
         {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
          <div key={d} className="py-2 text-sm font-medium text-center text-slate-500 uppercase tracking-wider md:hidden">{d}</div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
        {/* Empty cells for previous month */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`pre-${i}`} className="border-r border-b bg-slate-50/30 p-1 md:p-2" />
        ))}
        
        {/* Days */}
        {days.map(day => {
          const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateString = currentDayDate.toISOString().split('T')[0];
          const isToday = new Date().toISOString().split('T')[0] === dateString;
          const dayOfWeek = currentDayDate.getDay();

          const dayTasks = tasks.filter(t => {
            // Basic filters
            if (t.isArchived || t.status === 'completed' || !t.deadline) return false;

            const tDate = new Date(t.deadline);
            const tDateString = t.deadline;

            // Don't show recurring tasks before their first deadline
            if (dateString < tDateString) return false;

            // One-time tasks
            if (t.frequency === 'one_time' || !t.frequency) {
              return tDateString === dateString;
            }

            // Recurring tasks
            if (t.frequency === 'daily') return true;
            
            if (t.frequency === 'weekly') {
              return dayOfWeek === tDate.getDay();
            }

            if (t.frequency === 'monday') {
              return dayOfWeek === 1; // 1 is Monday
            }

            if (t.frequency === 'monthly') {
              return day === tDate.getDate();
            }

            return false;
          });
          
          return (
            <div key={day} className={cn("border-r border-b p-1 md:p-2 min-h-[80px] md:min-h-[100px] flex flex-col gap-1 transition-colors hover:bg-slate-50", isToday && "bg-teal-50/30")}>
              <div className="flex justify-center mb-1">
                  <span className={cn(
                      "text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-white" : "text-slate-700"
                  )}>
                      {day}
                  </span>
              </div>
              
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] md:max-h-[120px]">
                {dayTasks.map(t => (
                    <div 
                        key={t.id + dateString} // Add dateString to key for recurring occurrences
                        className={cn(
                            "text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded border truncate font-medium cursor-pointer shadow-sm hover:scale-[1.02] transition-transform",
                            getStatusColor(t.status)
                        )}
                        title={t.title}
                        onClick={() => setSelectedTask(t)}
                    >
                    {t.title}
                    </div>
                ))}
              </div>
            </div>
          )
        })}
        
        {/* Empty cells for next month filling */}
        {Array.from({ length: (7 - (daysInMonth + firstDayOfMonth) % 7) % 7 }).map((_, i) => (
             <div key={`post-${i}`} className="border-r border-b bg-slate-50/30 p-2" />
        ))}
      </div>
      
      <TaskDetailModal 
        task={selectedTask} 
        tasks={tasks}
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />
    </div>
  );
}
