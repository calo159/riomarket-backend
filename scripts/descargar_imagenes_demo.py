#!/usr/bin/env python
"""Compatibilidad: genera los placeholders locales sin APIs externas.

Se mantiene el nombre histórico del script. Para buscar fotos reales con
licencia libre usa ``scripts/buscar_imagenes_libres.py`` (Openverse).
"""

try:
    from generar_placeholders import main
except ImportError:
    from scripts.generar_placeholders import main

if __name__ == "__main__":
    main()
