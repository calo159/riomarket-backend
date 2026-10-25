# Guión de presentación 5 minutos

## Usuarios de prueba
- Comprador: (ver datos cargados)
- Vendedor: (ver datos cargados)
- Administrador: (ver datos cargados)

## Pasos demo
1. Inicio (hero + catálogo)
2. Login comprador
3. Buscar producto, agregar al carrito
4. Checkout y confirmar pedido
5. Login vendedor y avanzar estado
6. Login admin y revisar verificación/auditoría

## Preguntas probables + respuestas
1. ¿Por qué cookies HttpOnly para refresh? Mitiga robo por XSS, access solo en memoria.
2. ¿JWT vs sesiones? JWT stateless con rotación + blacklist.
3. RBAC en dos capas: backend permisos + rutas protegidas frontend.
4. Rate limiting: DRF throttling por scope.
5. Cédula cifrada: Fernet en reposo.
6. Transacciones/stock: integridad en pedidos.
7. Caché: Redis en prod.
8. Pruebas: pytest + tests frontend/E2E.
