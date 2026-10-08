# ADR-002: Imágenes — media pública vs. media privada (foto de cédula)

**Estado**: Aceptado (Fase 0, revisada en auditoría)

## Decisión

Dos raíces de almacenamiento:

| Raíz | Contenido | ¿Se sirve estáticamente? |
|---|---|---|
| `MEDIA_ROOT` (`media/`) | imágenes de producto, banners | Sí, solo en `DEBUG` (`/media/...`) |
| `PRIVATE_MEDIA_ROOT` (`media_privado/`) | **foto de cédula**, documentos | **Nunca**. Solo por vista protegida (admin revisor) |

## Por qué

1. El requisito dice que la foto de cédula **no debe ser accesible por URL
   pública directa**. Servir `MEDIA_ROOT` con `django.conf.urls.static.static()`
   expondría cualquier archivo que aterrice ahí.
2. Separar las raíces hace que el requisito sea **estructural** (imposible
   exponerla por accidente olvidándose de un permiso en una vista), y no
   dependa de que alguien recuerde configurar nginx.
3. En producción, `media/` lo sirve el reverse proxy (nginx/CDN) y
   `media_privado/` lo entrega una vista DRF con `EsAdministrador` +
   control de acceso al revisor asignado (se construye en el Incremento 2).

## Consecuencias

- `validate_image_file()` + `renombrar_archivo()` (apps/common/validators.py)
  sanean nombre y tipo MIME **antes** de escribir en cualquiera de las dos
  raíces.
- Las rutas se pueden sobreescribir por variable de entorno
  (`PRIVATE_MEDIA_ROOT`), por lo que en producción pueden estar en un
  volumen distinto o incluso en object storage.
- `media/`, `media_privado/` y `test_media/` están en `.gitignore`.
