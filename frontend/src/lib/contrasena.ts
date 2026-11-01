import * as z from 'zod/mini';

/** Las mismas reglas que el registro: 8 caracteres o más, con al menos una letra y un número. */
export const contrasenaNueva = z
  .string()
  .check(
    z.minLength(8, 'La contraseña debe tener al menos 8 caracteres.'),
    z.regex(/[A-Za-z]/, 'Incluye al menos una letra.'),
    z.regex(/[0-9]/, 'Incluye al menos un número.'),
  );

export const AYUDA_CONTRASENA = 'Mínimo 8 caracteres, con letras y números.';
