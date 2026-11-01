/**
 * Símbolo de RioMarket: un toldo de puesto de mercado sobre dos olas de río.
 * La geometría es la de `public/brand/marca.svg` (generada con `scripts/generar_logo.py`); una prueba
 * comprueba que ambas coinciden.
 */
export const PANELES_TOLDO = [
  { d: 'M17.00 10L24.50 10L20.50 24A5.75 5.75 0 0 1 9.00 24Z', color: '#E4502A' },
  { d: 'M24.50 10L32.00 10L32.00 24A5.75 5.75 0 0 1 20.50 24Z', color: '#FFF4DC' },
  { d: 'M32.00 10L39.50 10L43.50 24A5.75 5.75 0 0 1 32.00 24Z', color: '#E4502A' },
  { d: 'M39.50 10L47.00 10L55.00 24A5.75 5.75 0 0 1 43.50 24Z', color: '#FFF4DC' },
] as const;

export const OLAS = [
  { d: 'M9.0 40.5q5.75 -7.2 11.5 0t11.5 0t11.5 0t11.5 0', color: '#FFD166' },
  { d: 'M9.0 50q5.75 -7.2 11.5 0t11.5 0t11.5 0t11.5 0', color: '#BFE3E7' },
] as const;

/**
 * `conFondo`: sobre superficies claras lleva su cuadro turquesa; sobre el turquesa o el oscuro
 * (encabezados, pie) se usa sin cuadro para que no se funda con el fondo.
 */
export function MarcaSvg({ conFondo = true, className }: { conFondo?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      {conFondo && <rect width="64" height="64" rx="14" fill="#00626D" />}
      {PANELES_TOLDO.map((panel) => (
        <path key={panel.d} d={panel.d} fill={panel.color} />
      ))}
      {OLAS.map((ola) => (
        <path
          key={ola.d}
          d={ola.d}
          fill="none"
          stroke={ola.color}
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
