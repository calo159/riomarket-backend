"""Construcción de URLs públicas para almacenamiento S3-compatible."""

from urllib.parse import urlsplit


def construir_media_url(endpoint: str, bucket: str, base_publica: str = "") -> str:
    """Devuelve la URL pública base (con ``/`` final) de los objetos del bucket.

    ``base_publica`` puede ser el host, la raíz pública o la URL que ya incluye
    el bucket. En los dos primeros casos se añade el bucket automáticamente.
    """
    endpoint = (endpoint or "").strip().rstrip("/")
    bucket = (bucket or "").strip().strip("/")
    base = (base_publica or "").strip().rstrip("/")

    if base:
        segmentos = [parte for parte in urlsplit(base).path.split("/") if parte]
        if bucket and (not segmentos or segmentos[-1] != bucket):
            base = f"{base}/{bucket}"
        return f"{base}/"

    if not endpoint:
        return f"/{bucket}/" if bucket else "/"

    if "/storage/v1/s3" in endpoint:
        prefijo = endpoint.replace("/storage/v1/s3", "/storage/v1/object/public")
        return f"{prefijo}/{bucket}/" if bucket else f"{prefijo}/"

    return f"{endpoint}/{bucket}/" if bucket else f"{endpoint}/"
