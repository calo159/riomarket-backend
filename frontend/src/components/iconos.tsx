import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/** Iconos propios de las categorías del diseño (trazo de 24x24). */
const TRAZOS: Record<string, ReactNode> = {
  arepas: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="6.5" />
      <path d="M6 11c1.5-1 3-1 4 0M13 13c1.5-1 3-1 4 0" />
    </>
  ),
  frutas: (
    <>
      <path d="M12 8c-5 0-7 3-7 6.5S8 21 12 21s7-3 7-6.5S17 8 12 8z" />
      <path d="M12 8c0-2 1-4 3.5-5" />
    </>
  ),
  pescados: (
    <>
      <path d="M3 12c3-5 8-6 12-4l5-3v14l-5-3c-4 2-9 1-12-4z" />
      <circle cx="8" cy="11" r=".6" />
    </>
  ),
  comida: <path d="M4 11h16a8 8 0 0 1-16 0zM9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4" />,
  dulces: (
    <>
      <rect x="6" y="8" width="12" height="9" rx="2" />
      <path d="m6 10-3-2v8l3-2M18 10l3-2v8l-3-2" />
    </>
  ),
  bebidas: (
    <>
      <path d="M7 3h10l-1 5v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8z" />
      <path d="M8 12h8" />
    </>
  ),
  artesanias: <path d="M6 9h12l1 11H5zM9 9c0-7 6-7 6 0" />,
  ropa: <path d="M8 3 3 7l2 3 2-1v12h10V9l2 1 2-3-5-4c-1 2-7 2-8 0z" />,
  generico: (
    <>
      <path d="M4 10h16l-1 10H5zM4 10l2-6h12l2 6" />
      <path d="M9 14h6" />
    </>
  ),
};

/** Colores de cada categoría: fondo y trazo en claro, y su pareja en oscuro. */
const COLORES: Record<string, string> = {
  arepas: 'bg-[#FFF1D6] text-[#9A5B00] dark:bg-[#3A2A0B] dark:text-[#F2B756]',
  frutas: 'bg-[#E2F4E7] text-[#0B7A3E] dark:bg-[#0F2C1A] dark:text-[#6FD596]',
  pescados: 'bg-[#DFF1FA] text-[#0D6797] dark:bg-[#0E2A3A] dark:text-[#7CC4EC]',
  comida: 'bg-[#FDE8E1] text-[#A62F11] dark:bg-[#3A1A12] dark:text-[#F2967C]',
  dulces: 'bg-[#FBE6F0] text-[#A0296A] dark:bg-[#381328] dark:text-[#EE95C4]',
  bebidas: 'bg-[#E4F2F5] text-[#00626D] dark:bg-[#0C2D33] dark:text-[#7DC9D3]',
  artesanias: 'bg-[#EFE8FB] text-[#5B3AA6] dark:bg-[#251A40] dark:text-[#B9A2F0]',
  ropa: 'bg-[#ECEFF1] text-[#37474F] dark:bg-slate-800 dark:text-slate-300',
  generico: 'bg-[#E5F3F4] text-[#00626D] dark:bg-slate-800 dark:text-brand-300',
};

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Devuelve la clave del icono para un nombre de categoría; las desconocidas usan el genérico. */
export function claveCategoria(nombre?: string | null): keyof typeof TRAZOS {
  const n = normalizar(nombre ?? '');
  if (n.startsWith('arepa')) return 'arepas';
  if (n.startsWith('fruta')) return 'frutas';
  if (n.startsWith('pescado')) return 'pescados';
  if (n.startsWith('comida')) return 'comida';
  if (n.startsWith('dulce')) return 'dulces';
  if (n.startsWith('bebida')) return 'bebidas';
  if (n.startsWith('artesan')) return 'artesanias';
  if (n.startsWith('ropa')) return 'ropa';
  return 'generico';
}

export function IconoCategoria({ nombre, className }: { nombre?: string | null; className?: string }) {
  const clave = claveCategoria(nombre);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-7 w-7', className)}
    >
      {TRAZOS[clave]}
    </svg>
  );
}

/** Círculo de color con el icono de la categoría. */
export function MedallaCategoria({
  nombre,
  className,
  iconoClassName,
}: {
  nombre?: string | null;
  className?: string;
  iconoClassName?: string;
}) {
  return (
    <span className={cn('grid place-items-center rounded-full', COLORES[claveCategoria(nombre)], className)}>
      <IconoCategoria nombre={nombre} className={iconoClassName} />
    </span>
  );
}

const FONDOS_LOGO = ['#0B7A3E', '#CF3F1B', '#0D5C8A', '#A0296A', '#00626D', '#5B3AA6'];

function hash(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

export function coloresDePuesto(nombre: string) {
  return FONDOS_LOGO[hash(nombre || 'riomarket') % FONDOS_LOGO.length];
}

export function inicialesDe(nombre: string) {
  return (
    (nombre || 'RM')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase() ?? '')
      .join('') || 'RM'
  );
}
