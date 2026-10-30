# ADR-008: Almacenamiento de imágenes y archivos

- Fecha: 2026-10-28
- Estado: Aceptado

## Contexto
Las imágenes subidas en Render se pierden en cada redeploy (disco efímero). Las fotos de cédula deben seguir siendo privadas.

## Decisión
- Usar `django-storages` con backend S3-compatible. Si existen `STORAGE_S3_*`, usar bucket público para productos/logos/portadas/avatares y bucket privado para documentos sensibles.
- Procesar imágenes al subir: validar contenido real con Pillow, eliminar metadatos EXIF, corregir orientación, redimensionar (máx 1600px), convertir a WebP y generar miniatura. No guardar EXIF con GPS.
- Fotos de cédula siguen en `PrivateMediaStorage` fuera de `media/` pública y se sirven por vista autorizada (ADR-002).
- Si no hay S3 configurado, se usa almacenamiento local con advertencia en logs.

## Consecuencias
Persistencia tras redeploy si S3 configurado, menor peso, menos riesgo de filtrado de metadatos. Requiere configuración manual de buckets en despliegue.
