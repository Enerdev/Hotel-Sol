import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificacionesProvider } from './context/NotificacionesContext';
import { AppLayout } from './components/layout/AppLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import LimpiezaPage from './pages/Limpieza';
import HabitacionesPage from './pages/Habitaciones';
import ClientesPage from './pages/Clientes';
import ReservasPage from './pages/Reservas';
import TarifasPage from './pages/Tarifas';
import PersonalPage from './pages/Personal';
import ProductosPage from './pages/Productos';
import ReportesPage from './pages/Reportes';
import ConfiguracionPage from './pages/Configuracion';
import CajaPage from './pages/Caja';
import FacturacionPage from './pages/Facturacion';
import { Hotel } from 'lucide-react';
import type { Rol } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Hotel className="size-8 text-accent animate-pulse" />
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RoleRoute({
  roles,
  children,
}: {
  roles: Rol[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.rol)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificacionesProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/limpieza" element={<LimpiezaPage />} />

              <Route
                path="/habitaciones"
                element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                    <HabitacionesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                    <ClientesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/reservas"
                element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                    <ReservasPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/productos"
                element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                    <ProductosPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/reportes"
                element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                    <ReportesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/tarifas"
                element={
                  <RoleRoute roles={['admin']}>
                    <TarifasPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/personal"
                element={
                  <RoleRoute roles={['admin']}>
                    <PersonalPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/caja"
                element={
                  <RoleRoute roles={['admin']}>
                    <CajaPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/facturacion"
                element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                    <FacturacionPage />
                  </RoleRoute>
                }
              />
              <Route
                 path="/facturacion"
                 element={
                  <RoleRoute roles={['admin', 'recepcionista']}>
                   <FacturacionPage />
                 </RoleRoute>
           }
/>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            toastOptions={{
              style: {
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-color)',
                color: 'var(--color-text-primary)',
              },
            }}
          />
        </NotificacionesProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
