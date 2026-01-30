"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Task } from "@/types";
import { Trophy, Target, Flame, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductivityStatsProps {
  tasks: Task[];
}

export function ProductivityStats({ tasks }: ProductivityStatsProps) {
  // 1. Filtrar solo tareas activas (no archivadas)
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const total = activeTasks.length;
  const completed = activeTasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  
  // 2. Calcular porcentaje
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  // 3. Datos para el gráfico
  const data = [
    { name: "Finalizadas", value: completed, color: "var(--primary)" }, // Tu color Turquesa
    { name: "Pendientes", value: pending, color: "#e2e8f0" }, // Gris claro
  ];

  // 4. Mensaje motivacional dinámico
  let message = "¡A por todas! 🚀";
  let subMessage = "Comienza tu día organizando tus pendientes.";
  let Icon = Target;

  if (percentage > 0 && percentage < 50) {
    message = "¡Buen arranque! 🔥";
    subMessage = "Estás calentando motores. ¡Sigue así!";
    Icon = Flame;
  } else if (percentage >= 50 && percentage < 100) {
    message = "¡Ya pasaste la mitad! 💪";
    subMessage = "La meta está cerca, no te detengas ahora.";
    Icon = Trophy;
  } else if (percentage === 100 && total > 0) {
    message = "¡Misión Cumplida! 🎉";
    subMessage = "Has terminado todo por hoy. ¡Disfruta tu descanso!";
    Icon = CheckCircle2;
  }

  if (total === 0) return null; // No mostrar nada si no hay tareas

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      
      {/* TARJETA 1: El Gráfico de Progreso */}
      <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm relative overflow-hidden">
        <div className="flex flex-col gap-2 z-10 max-w-[60%]">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
            <Icon className="w-4 h-4" />
            <span>Resumen del Día</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {message}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {subMessage}
          </p>
          
          <div className="mt-4 flex items-center gap-4">
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

        {/* Gráfico Circular */}
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
            {/* Texto % en el centro */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {percentage}%
                </span>
            </div>
        </div>
        
        {/* Decoración de fondo */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0" />
      </div>

      {/* TARJETA 2: La Próxima Meta (Gamificación) */}
      <div className="bg-gradient-to-br from-primary to-teal-600 rounded-xl p-6 text-white shadow-lg flex flex-col justify-center relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Tu Racha</span>
            </div>
            <div className="text-3xl font-bold mb-1">Nivel {Math.floor(completed / 5) + 1}</div>
            <p className="text-xs text-white/80 leading-relaxed">
               ¡Has completado {completed} tareas! 
               {pending > 0 
                 ? ` Termina ${Math.min(3, pending)} más para subir de nivel.` 
                 : " Estás en la cima hoy."}
            </p>
            
            {/* Barra de XP */}
            <div className="mt-4 h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-white/90 rounded-full transition-all duration-1000"
                    style={{ width: `${(completed % 5) * 20}%` }}
                />
            </div>
         </div>

         {/* Decoración circular */}
         <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </div>
    </div>
  );
}