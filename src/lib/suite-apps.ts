export type SuiteApp = {
  id: string;
  title: string;
  href: string;
  current?: boolean;
};

const RG_SUITE_URL = (
  process.env.NEXT_PUBLIC_RG_SUITE_URL || "https://rg-suite.vercel.app"
).replace(/\/$/, "");

const FINANZAS_URL =
  process.env.NEXT_PUBLIC_FINANZAS_URL ||
  "https://finanzas-socios-app.vercel.app";

const REMU_URL =
  process.env.NEXT_PUBLIC_REMU_URL ||
  "https://remuneraciones-rg.onrender.com/app";

/** Misma lista que el lanzador de RG Suite, con URLs reales. */
export const SUITE_APPS: SuiteApp[] = [
  { id: "finanzas", title: "Finanzas Rg", href: FINANZAS_URL },
  { id: "inventario", title: "Inventario", href: `${RG_SUITE_URL}/inventario` },
  {
    id: "recetas",
    title: "Formulador de Recetas",
    href: `${RG_SUITE_URL}/recetas`,
  },
  { id: "caja", title: "Caja", href: `${RG_SUITE_URL}/caja` },
  { id: "fudo", title: "Fudo", href: `${RG_SUITE_URL}/fudo` },
  { id: "tareas", title: "Tareas", href: "/", current: true },
  { id: "remu", title: "Remuneraciones", href: REMU_URL },
  { id: "usuarios", title: "Usuarios", href: `${RG_SUITE_URL}/usuarios` },
];

export function currentSuiteApp() {
  return SUITE_APPS.find((app) => app.current) ?? SUITE_APPS[0];
}
