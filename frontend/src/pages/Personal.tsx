import { useState } from 'react';
import { Users, BarChart3 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { EmpleadosList } from '../components/personal/EmpleadosList';
import { ProductividadLimpieza } from '../components/personal/ProductividadLimpieza';
import { cn } from '../lib/cn';

type Tab = 'empleados' | 'productividad';

export default function PersonalPage() {
  const [tab, setTab] = useState<Tab>('empleados');

  return (
    <>
      <Header
        title="Personal"
        description="Gestión de empleados, turnos y rendimiento"
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-color">
          <TabButton
            active={tab === 'empleados'}
            onClick={() => setTab('empleados')}
            icon={Users}
            label="Empleados"
          />
          <TabButton
            active={tab === 'productividad'}
            onClick={() => setTab('productividad')}
            icon={BarChart3}
            label="Productividad de limpieza"
          />
        </div>

        {/* Contenido */}
        <div className="pt-2">
          {tab === 'empleados' && <EmpleadosList />}
          {tab === 'productividad' && <ProductividadLimpieza />}
        </div>
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition',
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
