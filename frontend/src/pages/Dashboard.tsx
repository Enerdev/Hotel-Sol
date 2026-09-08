import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { RecepcionDashboard } from '../components/dashboard/RecepcionDashboard';
import { LimpiezaDashboard } from '../components/dashboard/LimpiezaDashboard';

const ROL_DESCRIPTION = {
  admin: 'Vista global del hotel · todos los módulos disponibles',
  recepcionista: 'Gestiona reservas, atiende huéspedes y valida limpieza',
  limpieza: 'Habitaciones que necesitan tu atención',
};

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <Header
        title={`Hola, ${user.nombres}`}
        description={ROL_DESCRIPTION[user.rol]}
      />

      <div className="flex-1 p-8">
        {user.rol === 'admin' && <AdminDashboard />}
        {user.rol === 'recepcionista' && <RecepcionDashboard />}
        {user.rol === 'limpieza' && <LimpiezaDashboard />}
      </div>
    </>
  );
}
