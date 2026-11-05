from django.urls import path

from apps.configuracion.views import ConfiguracionPublicaView

urlpatterns = [
    path("publica/", ConfiguracionPublicaView.as_view(), name="configuracion-publica"),
]
