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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
      
      {/* TARJETA 1: Gráfico y Resumen (Compacto) */}
      <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between shadow-sm relative overflow-hidden h-28 md:h-auto">
        <div className="flex flex-col justify-center gap-1 z-10 max-w-[65%]">
          <div className="flex items-center gap-1.5 text-primary font-bold uppercase tracking-wider text-[10px]">
            <Icon className="w-3.5 h-3.5" />
            <span>Resumen</span>
          </div>
          <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
            {message}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden md:block">
            {subMessage}
          </p>
          
          <div className="mt-1 md:mt-3 flex items-center gap-3">
             <div className="flex flex-col leading-none">
                <span className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200">{completed}</span>
                <span className="text-[8px] md:text-[10px] text-slate-400 uppercase font-bold">Hechas</span>
             </div>
             <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
             <div className="flex flex-col leading-none">
                <span className="text-xl md:text-2xl font-bold text-slate-400">{pending}</span>
                <span className="text-[8px] md:text-[10px] text-slate-400 uppercase font-bold">Faltan</span>
             </div>
          </div>
        </div>

        {/* Gráfico Circular (Tamaño dinámico: 80px en móvil, 120px en desktop) */}
        <div className="h-[80px] w-[80px] md:h-[120px] md:w-[120px] relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={percentage === 100 ? 0 : 25} // Efecto lleno al 100%
                outerRadius={percentage === 100 ? 35 : 35}
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
            {/* Texto % en el centro (Oculto si está al 100% para mostrar el círculo lleno) */}
            {percentage < 100 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">
                        {percentage}%
                    </span>
                </div>
            )}
        </div>
        
        {/* Decoración sutil */}
        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-0 pointer-events-none" />
      </div>

      {/* TARJETA 2: Nivel (Modo Barra Horizontal en Móvil) */}
      <div className="bg-gradient-to-r md:bg-gradient-to-br from-primary to-teal-600 rounded-xl p-4 text-white shadow-md flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center relative overflow-hidden h-16 md:h-auto">
         <div className="relative z-10 flex items-center md:items-start gap-3 md:gap-0">
            {/* Icono y Título */}
            <div className="flex flex-col md:mb-2">
                <div className="flex items-center gap-1.5 opacity-90">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Nivel</span>
                </div>
                <div className="text-xl md:text-3xl font-bold leading-none md:mt-1">
                    {Math.floor(completed / 5) + 1}
                </div>
            </div>
         </div>

         {/* Barra de Progreso y Texto (Derecha en móvil, Abajo en desktop) */}
         <div className="flex flex-col items-end md:items-start w-[60%] md:w-full gap-1 z-10">
            <p className="text-[9px] text-white/90 text-right md:text-left truncate w-full">
               {pending > 0 
                 ? `${Math.min(3, pending)} más para subir` 
                 : "¡Nivel máx!"}
            </p>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-white/90 rounded-full transition-all duration-1000"
                    style={{ width: `${(completed % 5) * 20}%` }}
                />
            </div>
         </div>

         {/* Decoración */}
         <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>
    </div>
  );
}