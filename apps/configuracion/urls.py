from django.urls import path

from apps.configuracion.views import ConfiguracionPublicaView, SitioPublicoView

urlpatterns = [
    path("publica/", ConfiguracionPublicaView.as_view(), name="configuracion-publica"),
    path("sitio/", SitioPublicoView.as_view(), name="configuracion-sitio"),
]
