import type { Rol } from '../lib/types';

/** Pantalla de inicio tras iniciar sesión. El acceso real lo decide el backend (RBAC). */
export function inicioPorRol(rol: Rol | null | undefined): string {
  if (rol === 'vendedor') return '/vendedor';
  if (rol === 'administrador') return '/admin';
  return '/';
}
