import type { Puesto } from './types';

export interface PuestoUbicado {
  id: number;
  nombre: string;
  direccion: string;
  horario: string;
  ofreceDomicilio: boolean;
  lat: number;
  lng: number;
}

/** Centro de Riohacha, para cuando no hay ningún puesto con coordenadas. */
export const CENTRO_RIOHACHA: [number, number] = [11.5444, -72.9072];

function coordenada(valor: string | number | null | undefined, limite: number): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && Math.abs(numero) <= limite ? numero : null;
}

/** Puestos que se pueden dibujar en el mapa: los que tienen latitud y longitud válidas. */
export function puestosConCoordenadas(puestos: Puesto[]): PuestoUbicado[] {
  const ubicados: PuestoUbicado[] = [];
  for (const puesto of puestos) {
    const lat = coordenada(puesto.latitud, 90);
    const lng = coordenada(puesto.longitud, 180);
    if (lat === null || lng === null) continue;
    ubicados.push({
      id: puesto.id,
      nombre: puesto.nombre,
      direccion: puesto.direccion,
      horario: puesto.horario ?? '',
      ofreceDomicilio: Boolean(puesto.ofrece_domicilio),
      lat,
      lng,
    });
  }
  return ubicados;
}

/** Direcciones hacia el punto, en OpenStreetMap (sin claves ni cuentas). */
export function enlaceComoLlegar(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
}

/** Misma ruta en Google Maps, por si la persona prefiere esa aplicación. */
export function enlaceComoLlegarGoogle(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
