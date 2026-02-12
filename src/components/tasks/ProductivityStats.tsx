"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Task } from "@/types";
import { Trophy, Target, Flame, CheckCircle2 } from "lucide-react";

interface ProductivityStatsProps {
  tasks: Task[];
}

export function ProductivityStats({ tasks }: ProductivityStatsProps) {
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const total = activeTasks.length;
  const completed = activeTasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  const data = [
    { name: "Finalizadas", value: completed, color: "var(--primary)" },
    { name: "Pendientes", value: pending, color: "#e2e8f0" },
  ];

  let message = "A por todas 🚀";
  let subMessage = "Organiza tu día.";
  let Icon = Target;

  if (percentage > 0 && percentage < 50) {
    message = "Buen arranque 🔥";
    subMessage = "Sigue así.";
    Icon = Flame;
  } else if (percentage >= 50 && percentage < 100) {
    message = "Ya falta poco 💪";
    subMessage = "Casi en la meta.";
    Icon = Trophy;
  } else if (percentage === 100 && total > 0) {
    message = "¡Misión Cumplida! 🎉";
    subMessage = "Todo listo.";
    Icon = CheckCircle2;
  }

  if (total === 0) return null;

  return (
    <div>
      {/* Tarjeta Resumen: círculo a la izquierda, ancho reducido */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm relative overflow-hidden h-20 md:h-24">
        {/* Gráfico Circular a la izquierda (más grande) */}
        <div className="h-16 w-16 md:h-20 md:w-20 relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={64} minHeight={64}>
            <PieChart>
                <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={percentage === 100 ? 0 : 18}
                outerRadius={percentage === 100 ? 28 : 28}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
            </PieChart>
            </ResponsiveContainer>
            {percentage < 100 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {percentage}%
                    </span>
                </div>
            )}
        </div>

        <div className="flex flex-col justify-center gap-0.5 z-10 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-primary font-bold uppercase tracking-wider text-[10px]">
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>Resumen</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
            <h2 className="text-base md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
              {message}
            </h2>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200">{completed} <span className="text-[10px] font-normal uppercase text-slate-400">Hechas</span></span>
              <span className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
              <span className="text-sm md:text-base font-bold text-slate-500">{pending} <span className="text-[10px] font-normal uppercase text-slate-400">Faltan</span></span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
            {subMessage}
          </p>
        </div>
        
        {/* Decoración sutil */}
        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-0 pointer-events-none" />
      </div>
    </div>
  );
}