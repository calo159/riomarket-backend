from django.db import models


class ConfiguracionPlataforma(models.Model):
    """Valores que el administrador fija desde el panel (una sola fila, ``pk=1``).

    ``NULL`` significa «sin valor en el panel»: rige el de las variables de entorno del servidor.
    Así el administrador puede volver al valor original borrando el suyo.
    """

    comision_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    tarifa_domicilio = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    limite_aviso = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    limite_bloqueo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "configuracion_plataforma"
        verbose_name = "configuración de la plataforma"
        verbose_name_plural = "configuración de la plataforma"

    def __str__(self):
        return "Configuración de la plataforma"

    @classmethod
    def obtener(cls) -> "ConfiguracionPlataforma":
        configuracion, _ = cls.objects.get_or_create(pk=1)
        return configuracion
