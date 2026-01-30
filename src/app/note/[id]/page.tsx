import { getTasks, updateTaskNotes } from "@/actions/tasks";

export default async function NotePage({ params }: { params: { id: string } }) {
  // 1. Buscamos la tarea
  const tasks = await getTasks(); 
  const task = tasks.find((t) => t.id === params.id);

  if (!task) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-yellow-100 text-yellow-800 font-bold">
        Tarea no encontrada
      </div>
    );
  }

  // 2. Acción para guardar
  async function saveNoteAction(formData: FormData) {
    "use server";
    const note = formData.get("note") as string;
    await updateTaskNotes(task!.id, note);
  }

  return (
    // "Solución Nuclear": z-[9999] para ponerse encima de todo (incluida la barra lateral)
    <div className="fixed inset-0 z-[9999] w-screen h-screen bg-yellow-200 p-6 flex flex-col overflow-hidden font-sans">
      
      {/* Decoración: Cinta adhesiva arriba */}
      <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-32 h-10 bg-yellow-300/60 backdrop-blur-sm -rotate-1 shadow-sm border border-yellow-400/30 z-10" />

      {/* Título de la tarea */}
      <h1 className="text-xl font-bold text-slate-800 mt-4 mb-4 leading-tight border-b border-yellow-400/50 pb-2">
        {task.title}
      </h1>

      {/* Formulario de nota */}
      <form action={saveNoteAction} className="flex-1 flex flex-col">
        <textarea
            name="note"
            className="flex-1 w-full bg-transparent border-none resize-none focus:ring-0 focus:outline-none text-lg text-slate-800 placeholder:text-yellow-700/50 leading-relaxed"
            placeholder="Escribe aquí tus notas..."
            defaultValue={task.notes || ""}
            autoFocus
        />
        
        {/* Botón de guardar */}
        <div className="text-right mt-4 pt-2 border-t border-yellow-400/50 flex justify-between items-center">
           <span className="text-xs text-yellow-700 italic">Haz clic en guardar para confirmar</span>
           <button 
             type="submit" 
             className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-colors shadow-sm cursor-pointer"
           >
             Guardar
           </button>
        </div>
      </form>
    </div>
  );
}