import type { ReactNode } from 'react';

/** Contenedor centrado de las pantallas cortas de cuenta (recuperar y restablecer contraseña). */
export function TarjetaAuth({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1240px] items-center justify-center px-3 py-8 sm:px-5">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{descripcion}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
