# ADR-023: respaldo de la base y aviso de errores

**Estado**: Aceptado

## Contexto

Con pedidos, pagos y cuentas de personas reales en la base, había dos riesgos sin cubrir
([SEGURIDAD.md](../SEGURIDAD.md) lo dejaba como pendiente): perder los datos y enterarse de un fallo solo cuando alguien
se queja. El plan gratis de Supabase no ofrece copias que el proyecto pueda descargar ni restaurar por su cuenta, y el
despliegue gratis de Render no tiene tareas programadas propias (ADR-012). El repositorio es **público**.

## Decisión

### Respaldo diario, cifrado y restaurable

1. **Qué.** Un flujo de GitHub Actions (`respaldo.yml`) corre cada día a las 08:23 UTC (y a demanda). Con `pg_dump`
   vuelca solo el esquema `public` (los datos de RioMarket, no las tablas internas de Supabase), en formato
   personalizado y comprimido.
2. **Cifrado antes de salir.** El volcado se cifra con AES-256 (`gpg` con una frase, `RESPALDO_CLAVE`) en la misma
   tubería: el archivo en claro **nunca toca el disco**. Contiene correos, celulares y direcciones.
3. **Adónde.** Un bucket S3-compatible **privado**, distinto del de imágenes públicas, bajo `respaldos/`. **Nunca como
   artefacto de GitHub**: en un repositorio público cualquiera con cuenta de GitHub puede descargarlos.
4. **Cuánto se guarda.** 30 días (`RESPALDO_DIAS`). La limpieza corre **después** de subir el de hoy, así que si los
   respaldos llevaran semanas fallando, el último bueno no se borra.
5. **Falla a propósito.** Si falta algún secreto, el flujo termina en error y GitHub avisa por correo: un respaldo que se
   salta en silencio es peor que ninguno.
6. **La restauración se prueba, no se supone.** `respaldo-prueba.yml` hace el ciclo completo con datos de demostración
   (respalda, comprueba que el archivo no es legible, que una clave equivocada no abre, restaura en una base vacía,
   compara el conteo de filas de **cada tabla** con el original y arranca Django sobre la copia). Corre cuando cambian
   los scripts y una vez al mes.
7. **Restaurar sin accidentes.** `scripts/restaurar_respaldo.sh` se niega a restaurar sobre una base que ya tiene tablas
   (salvo `RESTAURAR_SOBRE_BASE_CON_DATOS=si`): un error al pegar la URL no pisa la base en uso.

### Aviso de errores

- **Sentry, opcional.** Con `SENTRY_DSN` en Render los errores no controlados llegan a Sentry con su línea de código; sin
  él no se importa ni se envía nada. Se configura para mandar **solo errores** y ningún dato de personas:
  `send_default_pii=False`, sin variables locales, sin cuerpo de petición, sin rendimiento, y un filtro
  (`limpiar_evento`) que descarta además cabeceras, cookies, la consulta y la identidad del usuario. Llega el tipo de
  error, el código, la ruta y el `X-Request-ID`, con lo que se busca la petición en los registros de Render
  ([ADR-015](ADR-015-observabilidad.md)).
- **Caídas.** El flujo `tareas-programadas.yml` (cada 10 minutos) falla si `/api/health/` no responde sano, y GitHub
  avisa por correo. Además, `despliegue.yml` prueba el sistema vivo tras cada despliegue.

## Consecuencias

- **Una acción tuya, una sola vez:** crear el bucket privado y cargar los secretos `RESPALDO_*` (lista en
  [despliegue.md](despliegue.md#respaldo-de-la-base)); y, si quieres avisos de errores, una cuenta de Sentry y
  `SENTRY_DSN`. Hasta entonces el respaldo diario falla y avisa.
- **Perder la frase `RESPALDO_CLAVE` equivale a perder los respaldos.** Guárdala también fuera de GitHub (gestor de
  contraseñas). Rotarla no descifra los archivos anteriores.
- El respaldo es de la **base**. Las imágenes viven en su propio bucket S3, que es duradero por sí mismo.
- Peor caso asumido: se pierde hasta un día de datos (el intervalo entre respaldos). Si el negocio crece, el siguiente
  paso es un plan con respaldo continuo (Supabase Pro o equivalente), no más scripts.
- Sentry nuevo en `requirements.txt`; se importa solo si hay DSN. Sus límites gratuitos son suficientes para este volumen.
- Pruebas: `apps/common/tests/test_sentry.py` y el flujo `respaldo-prueba.yml`.
