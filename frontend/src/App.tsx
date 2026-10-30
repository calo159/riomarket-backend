import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { PanelLayout } from './components/layout/PanelLayout';
import { RutaProtegida } from './auth/RutaProtegida';
import { CargandoPantalla } from './components/ui/Estado';

const Inicio = lazy(() => import('./pages/Inicio').then((modulo) => ({ default: modulo.Inicio })));
const Catalogo = lazy(() => import('./pages/Catalogo').then((modulo) => ({ default: modulo.Catalogo })));
const ProductoDetalle = lazy(() => import('./pages/ProductoDetalle').then((modulo) => ({ default: modulo.ProductoDetalle })));
const PuestoDetalle = lazy(() => import('./pages/PuestoDetalle').then((modulo) => ({ default: modulo.PuestoDetalle })));
const Login = lazy(() => import('./pages/auth/Login').then((modulo) => ({ default: modulo.Login })));
const Registro = lazy(() => import('./pages/auth/Registro').then((modulo) => ({ default: modulo.Registro })));
const Carrito = lazy(() => import('./pages/Carrito').then((modulo) => ({ default: modulo.Carrito })));
const Checkout = lazy(() => import('./pages/Checkout').then((modulo) => ({ default: modulo.Checkout })));
const MisPedidos = lazy(() => import('./pages/MisPedidos').then((modulo) => ({ default: modulo.MisPedidos })));
const PedidoDetalle = lazy(() => import('./pages/PedidoDetalle').then((modulo) => ({ default: modulo.PedidoDetalle })));
const Direcciones = lazy(() => import('./pages/Direcciones').then((modulo) => ({ default: modulo.Direcciones })));
const Notificaciones = lazy(() => import('./pages/Notificaciones').then((modulo) => ({ default: modulo.Notificaciones })));
const Perfil = lazy(() => import('./pages/Perfil').then((modulo) => ({ default: modulo.Perfil })));
const PanelVendedor = lazy(() => import('./pages/vendedor/PanelVendedor').then((modulo) => ({ default: modulo.PanelVendedor })));
const Verificacion = lazy(() => import('./pages/vendedor/Verificacion').then((modulo) => ({ default: modulo.Verificacion })));
const Puestos = lazy(() => import('./pages/vendedor/Puestos').then((modulo) => ({ default: modulo.Puestos })));
const ProductosVendedor = lazy(() => import('./pages/vendedor/Productos').then((modulo) => ({ default: modulo.ProductosVendedor })));
const PedidosVendedor = lazy(() => import('./pages/vendedor/PedidosVendedor').then((modulo) => ({ default: modulo.PedidosVendedor })));
const Cupones = lazy(() => import('./pages/vendedor/Cupones').then((modulo) => ({ default: modulo.Cupones })));
const ResenasVendedor = lazy(() => import('./pages/vendedor/ResenasVendedor').then((modulo) => ({ default: modulo.ResenasVendedor })));
const PanelAdmin = lazy(() => import('./pages/admin/PanelAdmin').then((modulo) => ({ default: modulo.PanelAdmin })));
const Usuarios = lazy(() => import('./pages/admin/Usuarios').then((modulo) => ({ default: modulo.Usuarios })));
const ProductosAdmin = lazy(() => import('./pages/admin/ProductosAdmin').then((modulo) => ({ default: modulo.ProductosAdmin })));
const CategoriasAdmin = lazy(() => import('./pages/admin/CategoriasAdmin').then((modulo) => ({ default: modulo.CategoriasAdmin })));
const ResenasAdmin = lazy(() => import('./pages/admin/ResenasAdmin').then((modulo) => ({ default: modulo.ResenasAdmin })));
const Verificaciones = lazy(() => import('./pages/admin/Verificaciones').then((modulo) => ({ default: modulo.Verificaciones })));
const PedidosAdmin = lazy(() => import('./pages/admin/PedidosAdmin').then((modulo) => ({ default: modulo.PedidosAdmin })));
const PuestosAdmin = lazy(() => import('./pages/admin/PuestosAdmin').then((modulo) => ({ default: modulo.PuestosAdmin })));
const PagosAdmin = lazy(() => import('./pages/admin/PagosAdmin').then((modulo) => ({ default: modulo.PagosAdmin })));
const Auditoria = lazy(() => import('./pages/admin/Auditoria').then((modulo) => ({ default: modulo.Auditoria })));
const CuponesAdmin = lazy(() => import('./pages/admin/CuponesAdmin').then((modulo) => ({ default: modulo.CuponesAdmin })));
const SinPermiso = lazy(() => import('./pages/SinPermiso').then((modulo) => ({ default: modulo.SinPermiso })));
const NoEncontrado = lazy(() => import('./pages/NoEncontrado').then((modulo) => ({ default: modulo.NoEncontrado })));

function DesplazarArriba() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <DesplazarArriba />
      <Suspense fallback={<CargandoPantalla mensaje="Cargando página…" />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Inicio />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="productos/:id" element={<ProductoDetalle />} />
            <Route path="puestos/:id" element={<PuestoDetalle />} />
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Registro />} />
            <Route path="carrito" element={<Carrito />} />
            <Route element={<RutaProtegida />}>
              <Route path="checkout" element={<Checkout />} />
              <Route path="mis-pedidos" element={<MisPedidos />} />
              <Route path="pedidos/:id" element={<PedidoDetalle />} />
              <Route path="direcciones" element={<Direcciones />} />
              <Route path="notificaciones" element={<Notificaciones />} />
              <Route path="perfil" element={<Perfil />} />
            </Route>
            <Route path="403" element={<SinPermiso />} />
          </Route>

          <Route element={<RutaProtegida roles={['vendedor']} />}>
            <Route path="vendedor" element={<PanelLayout />}>
              <Route index element={<PanelVendedor />} />
              <Route path="verificacion" element={<Verificacion />} />
              <Route path="puestos" element={<Puestos />} />
              <Route path="productos" element={<ProductosVendedor />} />
              <Route path="pedidos" element={<PedidosVendedor />} />
              <Route path="cupones" element={<Cupones />} />
              <Route path="resenas" element={<ResenasVendedor />} />
            </Route>
          </Route>

          <Route element={<RutaProtegida roles={['administrador']} />}>
            <Route path="admin" element={<PanelLayout />}>
              <Route index element={<PanelAdmin />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="verificaciones" element={<Verificaciones />} />
              <Route path="pedidos" element={<PedidosAdmin />} />
              <Route path="puestos" element={<PuestosAdmin />} />
              <Route path="productos" element={<ProductosAdmin />} />
              <Route path="categorias" element={<CategoriasAdmin />} />
              <Route path="resenas" element={<ResenasAdmin />} />
              <Route path="pagos" element={<PagosAdmin />} />
              <Route path="cupones" element={<CuponesAdmin />} />
              <Route path="auditoria" element={<Auditoria />} />
            </Route>
          </Route>

          <Route path="/inicio" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </Suspense>
    </>
  );
}
