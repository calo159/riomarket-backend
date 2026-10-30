import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './mapa.css';
import { CENTRO_RIOHACHA, type PuestoUbicado } from '../../lib/mapa';

export interface PropsMapa {
  puestos: PuestoUbicado[];
  /** Puesto cuya tarjeta se abre (al elegirlo en la lista); ``vez`` permite repetir el mismo. */
  seleccion?: { id: number; vez: number } | null;
  /** Se llama al elegir «Ver puesto» en la tarjeta del marcador. */
  onAbrirPuesto?: (id: number) => void;
  /** Mapa de solo consulta (mini-mapa): no se arrastra con un dedo ni abre tarjetas. */
  compacto?: boolean;
  etiqueta: string;
}

const ATRIBUCION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Marcador propio en CSS: sin imágenes externas ni los PNG por defecto de Leaflet. */
const ICONO = L.divIcon({
  className: 'marcador-puesto',
  html: '<span class="marcador-puesto__punta"></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 36],
  popupAnchor: [0, -34],
});

function fila(texto: string, clase: string): HTMLElement {
  const elemento = document.createElement('p');
  elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}

/** Tarjeta del marcador, armada con nodos de texto (los nombres los escriben los vendedores). */
function construirTarjeta(puesto: PuestoUbicado, onAbrir?: (id: number) => void): HTMLElement {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'tarjeta-puesto';
  tarjeta.append(fila(puesto.nombre, 'tarjeta-puesto__nombre'));
  tarjeta.append(fila(puesto.direccion, 'tarjeta-puesto__dato'));
  if (puesto.horario) tarjeta.append(fila(puesto.horario, 'tarjeta-puesto__dato'));
  tarjeta.append(
    fila(puesto.ofreceDomicilio ? 'Ofrece domicilio' : 'Solo retiro en el puesto', 'tarjeta-puesto__dato'),
  );
  const enlace = document.createElement('a');
  enlace.href = `/puestos/${puesto.id}`;
  enlace.className = 'tarjeta-puesto__enlace';
  enlace.textContent = 'Ver puesto';
  enlace.addEventListener('click', (evento) => {
    if (!onAbrir || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
    evento.preventDefault();
    onAbrir(puesto.id);
  });
  tarjeta.append(enlace);
  return tarjeta;
}

function encuadrar(mapa: L.Map, puestos: PuestoUbicado[]) {
  if (puestos.length === 0) {
    mapa.setView(CENTRO_RIOHACHA, 13);
  } else if (puestos.length === 1) {
    mapa.setView([puestos[0].lat, puestos[0].lng], 16);
  } else {
    mapa.fitBounds(L.latLngBounds(puestos.map((p) => [p.lat, p.lng] as [number, number])), {
      padding: [48, 48],
      maxZoom: 16,
    });
  }
}

export default function MapaLeaflet({ puestos, seleccion, onAbrirPuesto, compacto, etiqueta }: PropsMapa) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<number, L.Marker>());
  const alAbrir = useRef(onAbrirPuesto);
  alAbrir.current = onAbrirPuesto;

  useEffect(() => {
    if (!contenedor.current) return undefined;
    const instancia = L.map(contenedor.current, {
      scrollWheelZoom: false,
      dragging: !(compacto && L.Browser.mobile),
      zoomControl: true,
    });
    // Sin la bandera del prefijo por defecto: solo el nombre de la biblioteca y la atribución de OSM.
    instancia.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: ATRIBUCION,
    }).addTo(instancia);
    capa.current = L.layerGroup().addTo(instancia);
    mapa.current = instancia;
    const registro = marcadores.current;
    return () => {
      instancia.remove();
      mapa.current = null;
      capa.current = null;
      registro.clear();
    };
  }, [compacto]);

  useEffect(() => {
    const instancia = mapa.current;
    const grupo = capa.current;
    if (!instancia || !grupo) return;
    grupo.clearLayers();
    marcadores.current.clear();
    for (const puesto of puestos) {
      const marcador = L.marker([puesto.lat, puesto.lng], {
        icon: ICONO,
        title: puesto.nombre,
        alt: `Puesto ${puesto.nombre}`,
        keyboard: true,
      });
      if (!compacto) {
        marcador.bindPopup(construirTarjeta(puesto, (id) => alAbrir.current?.(id)), { minWidth: 190 });
      }
      marcador.addTo(grupo);
      marcadores.current.set(puesto.id, marcador);
    }
    encuadrar(instancia, puestos);
    // Tras un cambio de tamaño del contenedor, Leaflet necesita recalcular su área.
    instancia.invalidateSize();
  }, [puestos, compacto]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !seleccion) return;
    const marcador = marcadores.current.get(seleccion.id);
    if (!marcador) return;
    instancia.setView(marcador.getLatLng(), Math.max(instancia.getZoom(), 15));
    marcador.openPopup();
  }, [seleccion]);

  return <div ref={contenedor} className="mapa-puestos h-full w-full" role="region" aria-label={etiqueta} />;
}
