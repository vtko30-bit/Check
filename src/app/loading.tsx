export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Cargando Check...</p>
      </div>
    </div>
  );
}
