"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  Boxes,
  ChefHat,
  Landmark,
  ChevronsUpDown,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { currentSuiteApp, SUITE_APPS } from "@/lib/suite-apps";

const ICONS: Record<string, LucideIcon> = {
  finanzas: Landmark,
  inventario: Boxes,
  recetas: ChefHat,
  caja: Wallet,
  fudo: RefreshCw,
  tareas: ListChecks,
  remu: Users2,
  usuarios: ShieldCheck,
};

export function AppSwitcher() {
  const current = currentSuiteApp();
  const CurrentIcon = ICONS[current.id] ?? ListChecks;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-[#fbe7d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85e00] ${
          open ? "bg-[#fbe7d8]" : ""
        }`}
        aria-label="Cambiar de aplicación"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[#e85e00] text-white shadow-sm">
          <CurrentIcon className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-[#e85e00]">
            {current.title}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            RG Suite
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-500" aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Aplicaciones de RG Suite"
          className="absolute left-2 right-2 top-[calc(100%+6px)] z-50 rounded-[10px] border border-slate-200 bg-white p-1 shadow-lg"
        >
          {SUITE_APPS.map((app) => {
            const Icon = ICONS[app.id] ?? ListChecks;
            const className = `flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-[#fbe7d8] hover:text-[#d45500] ${
              app.current ? "font-semibold text-[#e85e00]" : "text-slate-800"
            }`;
            if (app.current) {
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  role="menuitem"
                  className={className}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {app.title}
                </Link>
              );
            }
            return (
              <a
                key={app.id}
                href={app.href}
                role="menuitem"
                className={className}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {app.title}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
