export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 md:px-8 space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-20 md:h-24 w-full max-w-md rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 ml-auto" />
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-12 bg-slate-100 dark:bg-slate-800" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900" />
        ))}
      </div>
    </div>
  );
}
