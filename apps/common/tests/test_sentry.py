"""El aviso de errores a Sentry es opcional y no manda datos de personas (ADR-023)."""

import sentry_sdk

from apps.common.observabilidad import iniciar_sentry, limpiar_evento


def _evento_con_datos_personales():
    return {
        "exception": {"values": [{"type": "ValueError", "value": "boom"}]},
        "request": {
            "url": "https://riomarket.onrender.com/api/auth/login/",
            "method": "POST",
            "data": {"correo": "ana@example.com", "password": "Secreta123!"},
            "cookies": {"refresh": "token-secreto"},
            "query_string": "correo=ana@example.com",
            "headers": {"Authorization": "Bearer abc", "Cookie": "refresh=token-secreto"},
            "env": {"REMOTE_ADDR": "10.0.0.1"},
        },
        "user": {"id": 7, "email": "ana@example.com", "ip_address": "10.0.0.1"},
        "tags": {"request_id": "abc12345"},
    }


class TestLimpiarEvento:
    def test_quita_cuerpo_cookies_cabeceras_consulta_y_usuario(self):
        limpio = limpiar_evento(_evento_con_datos_personales())

        assert set(limpio["request"]) == {"url", "method"}
        assert "user" not in limpio

    def test_conserva_lo_que_sirve_para_diagnosticar(self):
        limpio = limpiar_evento(_evento_con_datos_personales())

        assert limpio["exception"]["values"][0]["type"] == "ValueError"
        assert limpio["request"]["url"].endswith("/api/auth/login/")
        assert limpio["tags"] == {"request_id": "abc12345"}

    def test_nada_personal_queda_en_ninguna_parte_del_evento(self):
        texto = str(limpiar_evento(_evento_con_datos_personales()))

        for dato in ("ana@example.com", "Secreta123!", "token-secreto", "Bearer abc", "10.0.0.1"):
            assert dato not in texto

    def test_un_evento_sin_peticion_no_rompe(self):
        assert limpiar_evento({"message": "algo"}) == {"message": "algo"}
        assert limpiar_evento({"request": None}) == {"request": None}


class TestIniciarSentry:
    def test_sin_dsn_no_hace_nada(self, monkeypatch):
        llamadas = []
        monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: llamadas.append(kwargs))

        assert iniciar_sentry("") is False
        assert llamadas == []

    def test_con_dsn_se_configura_sin_datos_personales_ni_rendimiento(self, monkeypatch):
        llamadas = []
        monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: llamadas.append(kwargs))

        assert iniciar_sentry("https://clave@o1.ingest.sentry.io/2", release="abc1234") is True

        (opciones,) = llamadas
        assert opciones["send_default_pii"] is False
        assert opciones["include_local_variables"] is False
        assert opciones["max_request_body_size"] == "never"
        assert opciones["traces_sample_rate"] == 0.0
        assert opciones["before_send"] is limpiar_evento
        assert opciones["release"] == "abc1234"
        assert opciones["environment"] == "produccion"

    def test_sin_release_no_manda_uno_vacio(self, monkeypatch):
        llamadas = []
        monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: llamadas.append(kwargs))

        iniciar_sentry("https://clave@o1.ingest.sentry.io/2", release="")

        assert llamadas[0]["release"] is None
