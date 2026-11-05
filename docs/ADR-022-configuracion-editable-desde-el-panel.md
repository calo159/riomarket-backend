# ADR-022: configuración editable desde el panel

**Estado**: Aceptado

## Contexto

La comisión de la plataforma, la tarifa de domicilio y los límites de atraso de la comisión
([ADR-020](ADR-020-politica-de-atraso.md)) vivían en variables de entorno de Render. Cambiar uno exigía entrar a Render,
editar la variable y esperar el reinicio, sin motivo ni registro de quién lo hizo. Son justo los números que más
conviene ajustar con el mercado funcionando, y los que mueven dinero.

Además, el formulario de pago anunciaba la tarifa de domicilio con un valor **fijado al compilar el frontend**
(`VITE_TARIFA_DOMICILIO`, 3000 por defecto), distinto del que el servidor cobraba (`DOMICILIO_TARIFA_BASE`): nada
garantizaba que coincidieran.

## Decisión

El administrador cambia estos cuatro valores desde **Administración → Configuración** (`/admin/configuracion`, recurso
`admin.configuracion`, asignable a roles como cualquier otro):

| Valor | Ajuste que reemplaza | Tope |
|---|---|---|
| Comisión de la plataforma (%) | `PLATFORM_COMMISSION_PERCENTAGE` | 0 a 50 |
| Tarifa de domicilio ($) | `DOMICILIO_TARIFA_BASE` | 0 a 100.000 |
| Aviso por comisión pendiente ($) | `COMISION_LIMITE_AVISO` | 0 a 10.000.000 |
| Pausa por comisión pendiente ($) | `COMISION_LIMITE_BLOQUEO` | 0 a 10.000.000 |

1. **Lo del panel gana; la variable de Render es el valor de partida.** Una tabla de una sola fila
   (`configuracion_plataforma`) guarda lo que el administrador fijó; `NULL` significa «sin valor en el panel» y rige la
   variable. Borrar el valor del panel («Usar el del servidor») devuelve a la variable. Con
   `AJUSTES_EN_BASE_DE_DATOS=False` se ignora el panel por completo.
2. **Un solo punto de lectura.** `apps.common.ajustes.valor(nombre)` reemplaza a las lecturas directas de `settings` en
   `pricing.py` y `comisiones.py`. `common` es el nivel 0 y no puede importar la tabla
   ([ADR-017](ADR-017-arquitectura-en-capas.md)), así que solo define un gancho y la app `configuracion` (nivel 1)
   registra su proveedor al arrancar (`AppConfig.ready`), igual que el menú registra sus insignias.
3. **Solo hacia adelante.** Un cambio rige para los pedidos y pagos **nuevos**. Los ya creados guardan la comisión y la
   tarifa con que nacieron (`Pago.comision_plataforma`, `Pedido.tarifa_domicilio`), así que el historial y las cuentas de
   comisión no se mueven. Los límites sí se evalúan en vivo: bajar uno puede pausar de inmediato a quien ya los pasa; la
   pantalla lo advierte y muestra cuántos vendedores hay en cada estado.
4. **Caché corta.** Cada petición de compra pregunta varias veces por estos valores, así que se leen de la base como
   mucho una vez cada `AJUSTES_CACHE_SEGUNDOS` (15) por proceso y se descartan al guardar. En el proceso que guarda el
   cambio se ve al instante; en otro proceso tarda a lo sumo esos segundos. Si la base falla, se sigue con lo último
   sabido o con la variable: leer la configuración nunca rompe una compra.
5. **Cuidado con el error de dedo.** Topes por valor (un 80 en vez de un 8 se rechaza), la pausa no puede quedar por
   debajo del aviso (0 apaga ese escalón) y todo cambio exige **motivo** de 5 a 300 caracteres.
6. **Auditoría.** Cada valor cambiado deja un registro (`actualizar` sobre `configuracion`) con el valor anterior, el
   nuevo, si quedó del panel o volvió al servidor, quién y por qué; se ve en Administración → Auditoría. Un cambio
   rechazado no deja registro ni cambia nada (todo ocurre en una transacción).
7. **La tienda anuncia la tarifa que se cobra.** `GET /api/configuracion/publica/` (sin sesión) devuelve la tarifa de
   domicilio vigente, calculada por el mismo `pricing` que usa el cobro; el checkout la pide en lugar de usar el valor de
   compilación. No expone la comisión ni los límites.

## Consecuencias

- La comisión y la tarifa se ajustan sin tocar Render ni reiniciar, con motivo y rastro. `VITE_TARIFA_DOMICILIO` queda
  solo como valor mientras llega la respuesta del servidor.
- Hay dos fuentes para cada valor (panel y variable). La pantalla siempre muestra cuál rige y cuál sería el del servidor,
  para que no haya sorpresas al «volver al servidor».
- Con varios procesos, durante hasta 15 s algunos pueden aplicar el valor anterior. Es aceptable para estos números y
  se evita una consulta más por cada cálculo de precio.
- Otros ajustes (plazo para confirmar un pedido, quién se queda con la tarifa de domicilio, secretos de la pasarela)
  **siguen en el servidor** a propósito: cambian reglas o credenciales, no parámetros de negocio de uso diario.
- Pruebas: `apps/administration/tests/test_configuracion.py` (API, validación, auditoría y permisos),
  `apps/payments/tests/test_ajustes_del_panel.py` (llega al dinero y no toca lo anterior),
  `apps/configuracion/tests/test_lectura.py` (caché y tolerancia a fallos) y las de la pantalla.
