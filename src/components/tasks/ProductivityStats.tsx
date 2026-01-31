"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Task } from "@/types";
import { Trophy, Target, Flame, CheckCircle2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductivityStatsProps {
  tasks: Task[];
}

export function ProductivityStats({ tasks }: ProductivityStatsProps) {
  // 1. Datos
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const total = activeTasks.length;
  const completed = activeTasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  // 2. Datos para el gráfico
  const data = [
    { name: "Finalizadas", value: completed, color: "var(--primary)" },
    { name: "Pendientes", value: pending, color: "#e2e8f0" },
  ];

  // 3. Mensaje motivacional
  let message = "A por todas";
  let Icon = Target;

  if (percentage > 0 && percentage < 50) {
    message = "Buen inicio";
    Icon = Flame;
  } else if (percentage >= 50 && percentage < 100) {
    message = "Ya falta poco";
    Icon = Trophy;
  } else if (percentage === 100 && total > 0) {
    message = "¡Completado!";
    Icon = CheckCircle2;
  }

  if (total === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      
      {/* TARJETA 1: Resumen (Adaptable) */}
      <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden flex flex-col justify-center">
        
        {/* VISTA MÓVIL (Compacta) */}
        <div className="md:hidden flex flex-col items-center text-center">
            <div className="bg-primary/10 p-2 rounded-full mb-2">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {completed}/{total}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Tareas Hechas
            </span>
        </div>

        {/* VISTA DESKTOP (Completa con Gráfico) */}
        <div className="hidden md:flex items-center justify-between">
            <div className="flex flex-col gap-2 z-10 max-w-[60%]">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                    <Icon className="w-4 h-4" />
                    <span>Resumen del Día</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {message}
                </h2>
                <div className="mt-2 flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{completed}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Hechas</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-slate-400">{pending}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Faltan</span>
                    </div>
                </div>
            </div>

            {/* Gráfico Circular (Solo Desktop) */}
            <div className="h-[120px] w-[120px] relative">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {percentage}%
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* TARJETA 2: Nivel (Adaptable) */}
      <div className="col-span-1 bg-gradient-to-br from-primary to-teal-600 rounded-xl p-4 text-white shadow-md flex flex-col justify-center relative overflow-hidden">
         <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-1.5 mb-1 opacity-90">
                <Trophy className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Nivel</span>
            </div>
            
            <div className="text-2xl md:text-3xl font-bold mb-2">
                {Math.floor(completed / 5) + 1}
            </div>
            
            {/* Barra de XP */}
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-white/90 rounded-full transition-all duration-1000"
                    style={{ width: `${(completed % 5) * 20}%` }}
                />
            </div>
            
            <p className="text-[9px] text-white/80 mt-2 hidden md:block">
               {pending > 0 ? `Completa ${Math.min(3, pending)} más para subir.` : "¡Máximo nivel hoy!"}
            </p>
         </div>

         {/* Decoración */}
         <div className="absolute -bottom-4 -right-4 w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full blur-xl" />
      </div>
    </div>
  );
}