"""Cabeceras de caché para los archivos estáticos que no llevan hash en su nombre."""

SIETE_DIAS = 7 * 24 * 60 * 60

# Fotos del build (categorías y landing): sin hash, pero cambian muy rara vez. Si se reemplaza una,
# conviene cambiarle el nombre para no esperar a que venza la caché de los visitantes.
PREFIJOS_FOTOS_FIJAS = ("/categorias/", "/landing/")


def cache_de_fotos_fijas(headers, path, url):
    """Gancho de WhiteNoise: una semana de caché para las fotos fijas; el resto no cambia."""
    if url.startswith(PREFIJOS_FOTOS_FIJAS):
        headers["Cache-Control"] = f"max-age={SIETE_DIAS}, public"
