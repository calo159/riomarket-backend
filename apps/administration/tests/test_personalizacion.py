"""El administrador personaliza la identidad y los textos del sitio sin tocar código (ADR-024)."""

import json
import re

import pytest
from django.core import mail
from django.test import RequestFactory

from apps.audit.models import RegistroAuditoria
from apps.configuracion import lectura
from apps.configuracion.models import PersonalizacionSitio
from apps.configuracion.sitio import CAMPOS, DEFECTOS, PALETAS
from apps.rbac.models import Recurso, RolRecurso
from apps.sitio.seo import completar_index

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("ajustes_del_panel")]

URL = "/api/admin/personalizacion/"
PUBLICA = "/api/configuracion/sitio/"


def _guardar(cliente, valores):
    return cliente.put(URL, {"valores": valores}, format="json")


def _campo(respuesta, clave):
    for grupo in respuesta.json()["grupos"]:
        for campo in grupo["campos"]:
            if campo["clave"] == clave:
                return campo
    raise AssertionError(clave)


def _errores(respuesta):
    return respuesta.json()["errors"]


class TestPermisos:
    def test_sin_sesion_no_entra(self, cliente_anon):
        assert cliente_anon.get(URL).status_code == 401
        assert _guardar(cliente_anon, {"nombre_marca": "X"}).status_code == 401

    def test_el_comprador_y_el_vendedor_no_pueden_ver_ni_cambiar(
        self, cliente_comprador, cliente_vendedor
    ):
        for cliente in (cliente_comprador, cliente_vendedor):
            assert cliente.get(URL).status_code == 403
            assert _guardar(cliente, {"nombre_marca": "X"}).status_code == 403
        assert not PersonalizacionSitio.objects.exists()

    def test_solo_el_rol_administrador_tiene_el_recurso(self):
        recurso = Recurso.objects.get(codigo="admin.personalizacion")

        roles = set(
            RolRecurso.objects.filter(id_recurso=recurso).values_list("id_rol__nombre", flat=True)
        )

        assert roles == {"administrador"}
        assert recurso.ruta == "/admin/personalizacion"

    def test_un_administrador_sin_el_recurso_tampoco_entra(self, cliente_admin, admin):
        RolRecurso.objects.filter(id_recurso__codigo="admin.personalizacion").delete()

        assert cliente_admin.get(URL).status_code == 403


class TestVer:
    def test_sin_cambios_todo_viene_de_por_defecto(self, cliente_admin):
        respuesta = cliente_admin.get(URL)

        assert respuesta.status_code == 200
        marca = _campo(respuesta, "nombre_marca")
        assert marca["valor"] == "RioMarket"
        assert marca["personalizado"] is False
        assert marca["defecto"] == "RioMarket"
        assert [p["clave"] for p in respuesta.json()["paletas"]] == list(PALETAS)

    def test_cada_campo_definido_aparece_agrupado(self, cliente_admin):
        respuesta = cliente_admin.get(URL)

        claves = [c["clave"] for g in respuesta.json()["grupos"] for c in g["campos"]]
        assert claves == [c.clave for c in CAMPOS]

    def test_no_crea_la_fila_solo_por_mirar(self, cliente_admin):
        cliente_admin.get(URL)

        assert not PersonalizacionSitio.objects.exists()


class TestCambiar:
    def test_el_valor_propio_gana_al_de_por_defecto(self, cliente_admin):
        respuesta = _guardar(
            cliente_admin, {"nombre_marca": "  MercaCaribe  ", "ciudad": "Santa Marta"}
        )

        assert respuesta.status_code == 200
        assert _campo(respuesta, "nombre_marca")["valor"] == "MercaCaribe"
        assert _campo(respuesta, "nombre_marca")["personalizado"] is True
        assert _campo(respuesta, "ciudad")["valor"] == "Santa Marta"
        assert _campo(respuesta, "region")["personalizado"] is False

    def test_vacio_o_null_vuelve_al_valor_de_por_defecto(self, cliente_admin):
        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe", "ciudad": "Santa Marta"})

        respuesta = _guardar(cliente_admin, {"nombre_marca": "", "ciudad": None})

        assert _campo(respuesta, "nombre_marca")["valor"] == "RioMarket"
        assert _campo(respuesta, "ciudad")["valor"] == "Riohacha"
        assert PersonalizacionSitio.objects.get(pk=1).nombre_marca == ""

    def test_escribir_el_valor_de_por_defecto_no_cuenta_como_personalizado(self, cliente_admin):
        respuesta = _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})
        respuesta = _guardar(cliente_admin, {"nombre_marca": "RioMarket"})

        assert _campo(respuesta, "nombre_marca")["personalizado"] is False

    def test_el_cambio_se_ve_al_instante_en_la_lectura(self, cliente_admin):
        assert lectura.sitio()["nombre_marca"] == "RioMarket"

        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})

        assert lectura.sitio()["nombre_marca"] == "MercaCaribe"

    def test_cada_cambio_queda_en_la_auditoria_con_antes_y_despues(self, cliente_admin, admin):
        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})
        _guardar(cliente_admin, {"nombre_marca": "MercaSol"})

        registros = list(RegistroAuditoria.objects.filter(entidad="personalizacion").order_by("id"))

        assert len(registros) == 2
        assert registros[0].id_usuario_id == admin.id
        assert registros[0].detalle["campo"] == "Nombre de la marca"
        assert registros[0].detalle["de"] == "(por defecto) RioMarket"
        assert registros[0].detalle["a"] == "MercaCaribe"
        assert registros[1].detalle["de"] == "MercaCaribe"
        assert registros[1].detalle["a"] == "MercaSol"

    def test_sin_cambios_reales_se_rechaza_y_no_audita(self, cliente_admin):
        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})
        antes = RegistroAuditoria.objects.filter(entidad="personalizacion").count()

        respuesta = _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})

        assert respuesta.status_code == 400
        assert RegistroAuditoria.objects.filter(entidad="personalizacion").count() == antes

    def test_un_campo_desconocido_se_rechaza(self, cliente_admin):
        respuesta = _guardar(cliente_admin, {"comision": "1"})

        assert respuesta.status_code == 400

    def test_con_la_lectura_apagada_rigen_los_valores_de_por_defecto(self, cliente_admin, settings):
        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})
        settings.AJUSTES_EN_BASE_DE_DATOS = False
        lectura.invalidar_sitio()

        assert lectura.sitio() == DEFECTOS


class TestLosDefectosSiguenALaCiudad:
    def test_cambiar_solo_la_ciudad_cambia_la_descripcion_el_pie_y_la_palabra_destacada(
        self, cliente_admin, cliente_anon
    ):
        _guardar(cliente_admin, {"ciudad": "Santa Marta"})

        datos = cliente_anon.get(PUBLICA).json()

        assert datos["titular_destacado"] == "Santa Marta"
        assert "Santa Marta" in datos["descripcion"]
        assert "Santa Marta" in datos["texto_pie"]
        assert "Riohacha" not in datos["texto_pie"]

    def test_el_panel_muestra_el_de_por_defecto_ya_con_la_ciudad_y_conserva_la_plantilla(
        self, cliente_admin
    ):
        respuesta = _guardar(cliente_admin, {"ciudad": "Santa Marta"})

        destacada = _campo(respuesta, "titular_destacado")
        assert destacada["defecto"] == "Santa Marta"
        assert destacada["plantilla"] == "{ciudad}"
        assert destacada["personalizado"] is False

    def test_escribir_justo_lo_que_ya_rige_no_cuenta_como_personalizado(self, cliente_admin):
        _guardar(cliente_admin, {"ciudad": "Santa Marta"})

        respuesta = _guardar(
            cliente_admin, {"titular_destacado": "Santa Marta", "nombre_marca": "MercaCaribe"}
        )

        assert _campo(respuesta, "titular_destacado")["personalizado"] is False

    def test_un_valor_propio_no_lo_pisa_el_cambio_de_ciudad(self, cliente_admin, cliente_anon):
        _guardar(cliente_admin, {"texto_pie": "Del puesto a tu casa."})
        _guardar(cliente_admin, {"ciudad": "Santa Marta"})

        assert cliente_anon.get(PUBLICA).json()["texto_pie"] == "Del puesto a tu casa."

    def test_una_ciudad_con_llaves_no_rompe_nada(self, cliente_admin, cliente_anon):
        respuesta = _guardar(cliente_admin, {"ciudad": "{x} Ciudad {0}"})

        assert respuesta.status_code == 200
        assert cliente_anon.get(PUBLICA).json()["titular_destacado"] == "{x} Ciudad {0}"


class TestValidacion:
    @pytest.mark.parametrize(
        ("campo", "valor"),
        [
            ("nombre_marca", "x" * 41),
            ("nombre_marca", "<b>Marca</b>"),
            ("correo_soporte", "no-es-un-correo"),
            ("correo_soporte", "a b@c.com"),
            ("whatsapp_soporte", "300-abc"),
            ("whatsapp_soporte", "123"),
            ("instagram_url", "http://instagram.com/x"),
            ("instagram_url", "javascript:alert(1)"),
            ("facebook_url", "facebook.com/x"),
            ("color_marca", "rosado"),
            ("descripcion", "y" * 201),
        ],
    )
    def test_lo_invalido_se_rechaza_con_su_mensaje(self, cliente_admin, campo, valor):
        respuesta = _guardar(cliente_admin, {campo: valor})

        assert respuesta.status_code == 400
        assert campo in _errores(respuesta)
        assert not PersonalizacionSitio.objects.exclude(**{campo: ""}).exists()

    def test_si_un_campo_falla_no_se_guarda_ninguno(self, cliente_admin):
        respuesta = _guardar(
            cliente_admin, {"nombre_marca": "MercaCaribe", "correo_soporte": "mal"}
        )

        assert respuesta.status_code == 400
        assert not PersonalizacionSitio.objects.exists()

    def test_los_valores_buenos_se_aceptan(self, cliente_admin):
        respuesta = _guardar(
            cliente_admin,
            {
                "correo_soporte": "hola@mercacaribe.co",
                "whatsapp_soporte": "+57 300 123 4567",
                "instagram_url": "https://instagram.com/mercacaribe",
                "color_marca": "azul",
            },
        )

        assert respuesta.status_code == 200
        assert _campo(respuesta, "whatsapp_soporte")["valor"] == "+573001234567"
        assert _campo(respuesta, "color_marca")["valor"] == "azul"


class TestSitioPublico:
    def test_lo_ve_cualquiera_sin_sesion_y_trae_los_valores_de_por_defecto(self, cliente_anon):
        respuesta = cliente_anon.get(PUBLICA)

        assert respuesta.status_code == 200
        datos = respuesta.json()
        assert datos["nombre_marca"] == "RioMarket"
        assert datos["color_marca"] == "turquesa"
        assert datos["color_tema"] == "#00626D"

    def test_refleja_lo_que_fijo_el_administrador(self, cliente_admin, cliente_anon):
        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe", "color_marca": "verde"})

        datos = cliente_anon.get(PUBLICA).json()

        assert datos["nombre_marca"] == "MercaCaribe"
        assert datos["color_tema"] == PALETAS["verde"][1]

    def test_no_expone_nada_que_no_sea_de_la_identidad(self, cliente_anon):
        claves = set(cliente_anon.get(PUBLICA).json())

        assert claves == {c.clave for c in CAMPOS} | {"color_tema"}


INDEX = (
    '<html lang="es" data-marca="__MARCA__"><head>'
    '<meta name="theme-color" content="__COLOR_TEMA__" />'
    "<title>__TITULO__</title>"
    '<script id="sitio-config" type="application/json">__SITIO_JSON__</script>'
    '<meta property="og:title" content="__OG_TITULO__" />'
    "</head><body></body></html>"
)


class TestIndex:
    def test_el_html_inicial_ya_sale_con_la_marca_del_panel(self, cliente_admin):
        _guardar(
            cliente_admin,
            {"nombre_marca": "MercaCaribe", "ciudad": "Santa Marta", "color_marca": "ciruela"},
        )

        html = completar_index(INDEX, origen="https://x.co", path="/")

        assert "<title>MercaCaribe · Mercado de Santa Marta</title>" in html
        assert 'data-marca="ciruela"' in html
        assert f'content="{PALETAS["ciruela"][1]}"' in html
        incrustado = json.loads(re.search(r'type="application/json">(.*?)</script>', html).group(1))
        assert incrustado["nombre_marca"] == "MercaCaribe"
        assert "__" not in html

    def test_un_nombre_con_script_no_puede_romper_la_pagina(self, cliente_admin):
        _guardar(cliente_admin, {"descripcion": "Hola &amp; cierre"})
        PersonalizacionSitio.objects.filter(pk=1).update(
            nombre_marca="</script><script>alert(1)</script>"
        )
        lectura.invalidar_sitio()

        html = completar_index(INDEX, origen="https://x.co", path="/")

        assert html.count("</script>") == 1
        assert "<script>alert" not in html

    def test_con_la_lectura_apagada_sale_la_marca_original(self, settings):
        settings.AJUSTES_EN_BASE_DE_DATOS = False

        html = completar_index(INDEX, origen="https://x.co", path="/")

        assert "<title>RioMarket · Mercado de Riohacha</title>" in html
        assert 'data-marca="turquesa"' in html


class TestLaMarcaHablaEnLosMensajes:
    def test_el_correo_de_recuperar_contrasena_lleva_el_nombre_del_panel(
        self, cliente_admin, comprador, settings
    ):
        settings.NOTIFICATIONS_EMAIL_ENABLED = True
        _guardar(cliente_admin, {"nombre_marca": "MercaCaribe"})

        RequestFactory()  # (solo para dejar claro que no depende de la petición)
        from apps.accounts import services

        services.solicitar_recuperacion(correo=comprador.correo)

        assert mail.outbox[0].subject == "Recupera tu contraseña de MercaCaribe"
