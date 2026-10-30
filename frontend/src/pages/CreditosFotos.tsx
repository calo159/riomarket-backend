import { useEffect } from 'react';
import creditos from '../lib/creditosFotos.json';

export function CreditosFotos() {
  useEffect(() => {
    document.title = 'Créditos de fotos · RioMarket';
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Créditos de fotos</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Las fotos de demostración vienen de Wikimedia Commons. Las recortamos y redujimos; no implican respaldo de sus
        autores.
      </p>
      <ul className="mt-6 divide-y rounded-lg border bg-white dark:bg-slate-900">
        {creditos.map((credito) => (
          <li key={credito.origen + credito.foto} className="px-4 py-3 text-sm">
            <p className="font-semibold">{credito.foto}</p>
            <p className="text-slate-600 dark:text-slate-400">
              <a className="link" href={credito.origen} target="_blank" rel="noreferrer">
                {credito.titulo}
              </a>
              {' · '}
              {credito.autor}
              {' · '}
              {credito.urlLicencia ? (
                <a className="link" href={credito.urlLicencia} target="_blank" rel="noreferrer">
                  {credito.licencia}
                </a>
              ) : (
                credito.licencia
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
