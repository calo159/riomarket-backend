import { lazy } from "react";

export function precargarRuta(importador: () => Promise<unknown>) {
  if (typeof window === "undefined") return;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn && conn.saveData) return;
  void importador();
}

export function EnlacePrecarga({ to, importador, children, ...props }: any) {
  const manejar = () => precargarRuta(importador);
  return (
    <a href={to} onMouseEnter={manejar} onFocus={manejar} onTouchStart={manejar} {...props}>
      {children}
    </a>
  );
}
