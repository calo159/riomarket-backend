# ADR-024: personalización del sitio desde el panel

**Estado**: Aceptado

## Contexto

El proyecto se va a ofrecer a quien quiera montar su propio mercado. Hasta ahora, cambiar el nombre «RioMarket», la ciudad,
el titular de la portada, el correo de soporte o el color de la marca exigía **editar el código** y volver a desplegar:
el nombre estaba escrito a mano en cuarenta pantallas, en los correos y en los avisos. Quien compra el proyecto no tiene
por qué saber programar.

[ADR-022](ADR-022-configuracion-editable-desde-el-panel.md) ya resolvió lo mismo para los números del negocio (comisión,
domicilio, límites). Esto lo resuelve para la **identidad y los textos**.

## Decisión

El administrador cambia la identidad desde **Administración → Personalización** (`/admin/personalizacion`, recurso
`admin.personalizacion`, solo el rol administrador y asignable a otros roles como cualquier recurso).

| Grupo | Qué se cambia |
|---|---|
| Marca | Nombre, ciudad, departamento y país, descripción para buscadores y WhatsApp, color |
| Portada | Titular, palabra destacada y texto bajo el titular |
| Contacto | Correo de soporte, WhatsApp, Instagram y Facebook (los vacíos no se muestran) |
| Pie de página | Frase del pie y nota sobre los pagos |

1. **Una sola tabla de campos** (`apps/configuracion/sitio.py`) define clave, etiqueta, ayuda, tipo, largo y valor de por
   defecto. De ahí salen la validación del servidor, la API y la pantalla del panel (que se arma sola): agregar un campo es
   agregar una fila.
2. **Vacío significa «el de por defecto».** Una fila única (`configuracion_personalizacion_sitio`) guarda lo que el
   administrador escribió; una columna vacía deja el valor de RioMarket en Riohacha. Escribir justo el valor que ya rige
   no cuenta como cambio. Los valores de por defecto que nombran la ciudad o la marca (`{ciudad}`, `{nombre_marca}`)
   **siguen a lo que se escriba**: si solo cambias la ciudad, la descripción, el pie y la palabra destacada ya dicen la
   ciudad nueva.
3. **Validación.** Máximo de largo por campo, sin `<` ni `>`, correo con forma de correo, WhatsApp de 10 a 15 dígitos,
   redes con `https://` (nunca `javascript:` ni `http:`), color dentro de la lista. Si un campo falla, no se guarda ninguno.
4. **Auditoría.** Cada campo cambiado deja un registro (`personalizacion`) con el valor de antes y el de después. No se
   pide motivo: son textos, no dinero.
5. **El color es una paleta curada, no un selector libre.** Cinco paletas (turquesa, la original, azul mar, verde selva,
   ciruela y pizarra). Cada una se genera girando el tono de la original en OKLCH y conservando la luminosidad de cada
   escalón (`scripts/generar_paletas_marca.py`), así que el contraste del texto blanco sobre el color principal es 7:1 en
   todas y un administrador no puede dejar la tienda ilegible. Un test del frontend lo comprueba sobre el CSS generado. Los
   colores de acción (comprar, coral) y el amarillo del titular no cambian: son parte de cómo se entiende la tienda.
6. **Sin parpadeo.** Django ya completa `index.html` con metaetiquetas por ruta
   ([ADR-011](ADR-011-rendimiento-y-seo.md)); ahora también deja ahí la identidad (`<script type="application/json">`,
   escapado para que un nombre con `</script>` no rompa la página), el título de la pestaña, el color de la barra del
   navegador y `data-marca` en `<html>`. La primera pantalla ya sale con el nombre y el color correctos. Después,
   `SitioSync` pide `GET /api/configuracion/sitio/` y la actualiza cuando el administrador guarda.
7. **Lo que habla en nombre de la marca la lee de un solo lugar.** `apps.common.marca` (gancho de `common`, igual que
   `ajustes`; el nivel 0 no puede leer la tabla) lo usan el correo de recuperar contraseña, el nombre del remitente en
   Brevo y los avisos de comisión; en el frontend, `lib/sitio.ts` (`useSitio`, `nombreMarca`, `tituloPagina`).
8. **Vista previa en vivo.** Mientras el administrador escribe, la página entera ya muestra el nombre y el color nuevos; si
   sale sin guardar, vuelve lo que rige.
9. **Caché.** El servidor guarda la identidad unos segundos por proceso (`AJUSTES_CACHE_SEGUNDOS`, como ADR-022) y la
   descarta al guardar; el navegador siempre la revalida (`Cache-Control: no-cache`) para que el administrador no vea una
   marca vieja. Con `AJUSTES_EN_BASE_DE_DATOS=False` (las pruebas) rigen siempre los de por defecto.

## Lo que todavía no se puede cambiar desde el panel

Se dice claro para que nadie lo descubra después:

- **El logo y el icono de la aplicación.** El símbolo (toldo sobre el río) y los íconos de la PWA siguen siendo los de
  RioMarket; el nombre sí cambia. Subir un logo propio es el siguiente paso natural.
- **El `manifest.webmanifest` (nombre y color de la app instalada)** es un archivo estático.
- **Los textos legales** (términos y privacidad) usan el nombre, la ciudad y el correo del panel, pero su contenido jurídico
  lo debe revisar un abogado del nuevo dueño.
- **El centro del mapa** (coordenadas de Riohacha) y las fotos de demostración.
- Los textos largos de la página de bienvenida (`/`), salvo el nombre y la ciudad.

## Consecuencias

- Comprar el proyecto ya no exige tocar código para ponerle nombre, ciudad, titular, contacto y color.
- Cada campo nuevo pide una fila en `sitio.py`, una columna y su migración; la pantalla y la API no se tocan.
- Un administrador puede escribir un texto largo o raro: los topes de largo y la validación evitan romper el diseño, pero
  no juzgan el contenido (para eso está la auditoría).
