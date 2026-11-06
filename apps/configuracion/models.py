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


class PersonalizacionSitio(models.Model):
    """Identidad y textos del sitio que el administrador fija desde el panel (fila única, ``pk=1``).

    Cada columna vacía significa «sin valor propio»: rige el de ``apps.configuracion.sitio``.
    """

    nombre_marca = models.CharField(max_length=40, blank=True, default="")
    ciudad = models.CharField(max_length=60, blank=True, default="")
    region = models.CharField(max_length=80, blank=True, default="")
    descripcion = models.CharField(max_length=200, blank=True, default="")
    color_marca = models.CharField(max_length=20, blank=True, default="")
    titular_inicio = models.CharField(max_length=90, blank=True, default="")
    titular_destacado = models.CharField(max_length=40, blank=True, default="")
    subtitulo_inicio = models.CharField(max_length=240, blank=True, default="")
    correo_soporte = models.CharField(max_length=120, blank=True, default="")
    whatsapp_soporte = models.CharField(max_length=20, blank=True, default="")
    instagram_url = models.CharField(max_length=200, blank=True, default="")
    facebook_url = models.CharField(max_length=200, blank=True, default="")
    texto_pie = models.CharField(max_length=200, blank=True, default="")
    nota_pagos = models.CharField(max_length=160, blank=True, default="")
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "configuracion_personalizacion_sitio"
        verbose_name = "personalización del sitio"
        verbose_name_plural = "personalización del sitio"

    def __str__(self):
        return "Personalización del sitio"
