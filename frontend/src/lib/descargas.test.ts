import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./http', () => ({ api: mocks }));

import { descargarArchivo } from './descargas';

describe('descargarArchivo', () => {
  let clic: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.get.mockReset();
    clic = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:prueba');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clic as () => void);
  });

  afterEach(() => vi.restoreAllMocks());

  it('pide el archivo como blob con los filtros y lo guarda con el nombre del servidor', async () => {
    mocks.get.mockResolvedValue({
      data: new Blob(['a,b']),
      headers: { 'content-disposition': 'attachment; filename="usuarios-20261104.csv"', 'x-total-filas': '12' },
    });

    const resultado = await descargarArchivo('/admin/usuarios/exportar/', { rol: 'vendedor' }, 'usuarios.csv');

    expect(mocks.get).toHaveBeenCalledWith('/admin/usuarios/exportar/', { params: { rol: 'vendedor' }, responseType: 'blob' });
    expect(clic).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ nombre: 'usuarios-20261104.csv', filas: 12, truncado: false });
  });

  it('sin nombre del servidor usa el de respaldo, y avisa si se cortó en el tope', async () => {
    mocks.get.mockResolvedValue({
      data: new Blob(['a']),
      headers: { 'x-total-filas': '20000', 'x-exportacion-truncada': '1' },
    });

    const resultado = await descargarArchivo('/x/', {}, 'respaldo.csv');

    expect(resultado).toEqual({ nombre: 'respaldo.csv', filas: 20000, truncado: true });
  });

  it('si el servidor no informa las filas, no inventa un número', async () => {
    mocks.get.mockResolvedValue({ data: new Blob(['a']), headers: {} });

    expect((await descargarArchivo('/x/')).filas).toBeNull();
  });

  it('un error del servidor llega a quien llama (no deja una descarga a medias)', async () => {
    mocks.get.mockRejectedValue(new Error('403'));

    await expect(descargarArchivo('/x/')).rejects.toThrow('403');
    expect(clic).not.toHaveBeenCalled();
  });
});
