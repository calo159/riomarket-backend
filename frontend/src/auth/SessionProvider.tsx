import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshAccessToken, setAccessToken, setSessionLostHandler } from '../lib/http';
import { invalidarMenu } from '../lib/invalidarMenu';
import { borrarPistaDeSesion, guardarAvisoSesion, hayPistaDeSesion } from './tokens';
import type { Perfil, RespuestaLogin, Rol, UsuarioSesion } from '../lib/types';

type EstadoSesion = 'cargando' | 'anonimo' | 'autenticado';

interface Credenciales {
  correo: string;
  password: string;
}

interface ContextoSesion {
  usuario: UsuarioSesion | null;
  estado: EstadoSesion;
  autenticado: boolean;
  rol: Rol | null;
  iniciarSesion: (credenciales: Credenciales) => Promise<UsuarioSesion>;
  cerrarSesion: () => Promise<void>;
  actualizarUsuario: (cambios: Partial<UsuarioSesion>) => void;
  recargarPerfil: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

function aUsuarioSesion(perfil: Perfil): UsuarioSesion {
  return {
    id: perfil.id,
    nombre: perfil.nombre,
    correo: perfil.correo,
    celular: perfil.celular,
    rol: perfil.rol as Rol,
    estado: perfil.estado,
    estado_verificacion: perfil.estado_verificacion,
    fecha_registro: perfil.fecha_registro,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  // Sin pista de sesión (cookie legible) no hay nada que restaurar: el visitante anónimo ve la
  // página de inmediato, sin esperar un refresh que terminaría en 401.
  const [hayPista] = useState(hayPistaDeSesion);
  const [estado, setEstado] = useState<EstadoSesion>(hayPista ? 'cargando' : 'anonimo');

  const limpiarSesionLocal = useCallback(() => {
    setAccessToken(null);
    setUsuario(null);
    setEstado('anonimo');
    borrarPistaDeSesion();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    if (!hayPista) return undefined;
    let activo = true;

    async function restaurar() {
      try {
        await refreshAccessToken();
        const { data } = await api.get<Perfil>('/auth/perfil/');
        if (!activo) return;
        setUsuario(aUsuarioSesion(data));
        setEstado('autenticado');
      } catch {
        if (!activo) return;
        setAccessToken(null);
        setUsuario(null);
        setEstado('anonimo');
      }
    }

    void restaurar();
    return () => {
      activo = false;
    };
  }, [hayPista]);

  useEffect(() => {
    setSessionLostHandler(() => {
      setAccessToken(null);
      setUsuario(null);
      setEstado('anonimo');
      borrarPistaDeSesion();
      queryClient.clear();
      guardarAvisoSesion('Tu sesión expiró. Inicia sesión de nuevo.');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login?expirada=1');
      }
    });
    return () => setSessionLostHandler(null);
  }, [queryClient]);

  const iniciarSesion = useCallback(
    async (credenciales: Credenciales) => {
      const { data } = await api.post<RespuestaLogin>('/auth/login/', credenciales);
      setAccessToken(data.access);
      let sesion: UsuarioSesion = data.usuario;
      try {
        const perfil = await api.get<Perfil>('/auth/perfil/');
        sesion = aUsuarioSesion(perfil.data);
      } catch {
        /* el login sigue siendo válido aunque falle el perfil */
      }
      setUsuario(sesion);
      setEstado('autenticado');
      queryClient.clear();
      return sesion;
    },
    [queryClient],
  );

  const cerrarSesion = useCallback(async () => {
    try {
      await api.post('/auth/logout/', {});
    } catch {
      /* el logout local nunca se bloquea por la red */
    }
    limpiarSesionLocal();
  }, [limpiarSesionLocal]);

  const actualizarUsuario = useCallback((cambios: Partial<UsuarioSesion>) => {
    setUsuario((actual) => (actual ? { ...actual, ...cambios } : actual));
  }, []);

  const recargarPerfil = useCallback(async () => {
    const { data } = await api.get<Perfil>('/auth/perfil/');
    setUsuario(aUsuarioSesion(data));
    void invalidarMenu(queryClient);
  }, [queryClient]);

  const valor = useMemo<ContextoSesion>(
    () => ({
      usuario,
      estado,
      autenticado: estado === 'autenticado',
      rol: usuario?.rol ?? null,
      iniciarSesion,
      cerrarSesion,
      actualizarUsuario,
      recargarPerfil,
    }),
    [usuario, estado, iniciarSesion, cerrarSesion, actualizarUsuario, recargarPerfil],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSession(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSession debe usarse dentro de SessionProvider.');
  return contexto;
}
