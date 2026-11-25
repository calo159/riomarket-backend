"""Versión semántica de RioMarket: única fuente de verdad.

Al publicar una versión nueva se cambia aquí, se cierra la sección correspondiente de
``CHANGELOG.md`` y se crea el tag ``vX.Y.Z`` de git. Una prueba
(``apps/common/tests/test_version.py``) falla si esta cifra y el CHANGELOG no coinciden.
"""

__version__ = "1.1.0"
