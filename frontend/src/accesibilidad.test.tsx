import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Estrellas } from './components/ui/Estrellas';
import { NoEncontrado } from './pages/NoEncontrado';
import { Login } from './pages/auth/Login';
import { Registro } from './pages/auth/Registro';

vi.mock('./auth/SessionProvider', () => ({
  useSession: () => ({ estado: 'anonimo', rol: null, iniciarSesion: vi.fn() }),
}));
vi.mock('./components/ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

/** Reglas que el revisor automático de accesibilidad (axe) marcó como graves o moderadas. */
describe('accesibilidad', () => {
  it('las estrellas de solo lectura son una imagen con nombre (un aria-label suelto no es válido)', () => {
    render(<Estrellas valor={4} etiqueta="Calificación: 4 de 5" />);
    expect(screen.getByRole('img', { name: 'Calificación: 4 de 5' })).toBeInTheDocument();
  });

  it('las estrellas para calificar siguen siendo un grupo de opciones', () => {
    render(<Estrellas valor={2} interactivo onCambiar={() => undefined} etiqueta="Tu calificación" />);
    expect(screen.getByRole('radiogroup', { name: 'Tu calificación' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('la página 404 tiene su región principal y un único h1', () => {
    render(
      <MemoryRouter>
        <NoEncontrado />
      </MemoryRouter>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it.each([
    ['inicio de sesión', <Login key="l" />, 'Bienvenido de nuevo'],
    ['registro', <Registro key="r" />, 'Crea tu cuenta'],
  ])('%s: el título del formulario es el único h1 (el del panel decorativo no existe en el celular)', (_nombre, pagina, titulo) => {
    render(<MemoryRouter>{pagina}</MemoryRouter>);
    const encabezados = screen.getAllByRole('heading', { level: 1, hidden: true });
    expect(encabezados).toHaveLength(1);
    expect(encabezados[0]).toHaveTextContent(titulo);
  });
});
