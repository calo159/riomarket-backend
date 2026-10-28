"""Pruebas de la URL pública de medios para S3/Supabase."""

import pytest

from config.storage_urls import construir_media_url

SUPABASE = "https://demo.supabase.co/storage/v1/s3"
PUBLICA = "https://demo.supabase.co/storage/v1/object/public"


@pytest.mark.parametrize(
    ("endpoint", "bucket", "base", "esperado"),
    [
        (SUPABASE, "productos", "", f"{PUBLICA}/productos/"),
        (SUPABASE + "/", "productos", "", f"{PUBLICA}/productos/"),
        (
            SUPABASE,
            "productos",
            PUBLICA,
            f"{PUBLICA}/productos/",
        ),
        (
            SUPABASE,
            "productos",
            f"{PUBLICA}/productos/",
            f"{PUBLICA}/productos/",
        ),
        (
            "https://cdn.example.com",
            "productos",
            "",
            "https://cdn.example.com/productos/",
        ),
        (
            "https://cdn.example.com",
            "productos",
            "https://cdn.example.com/productos",
            "https://cdn.example.com/productos/",
        ),
        ("", "productos", "", "/productos/"),
        ("", "", "", "/"),
    ],
)
def test_construir_media_url(endpoint, bucket, base, esperado):
    assert construir_media_url(endpoint, bucket, base) == esperado
