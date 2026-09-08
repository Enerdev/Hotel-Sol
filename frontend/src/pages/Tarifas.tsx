import { useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { TarifasPorHora } from '../components/tarifas/TarifasPorHora';
import { TarifasPorTemporada } from '../components/tarifas/TarifasPorTemporada';
import { cn } from '../lib/cn';

type Tab = 'hora' | 'temporada';

export default function TarifasPage() {
  const [tab, setTab] = useState<Tab>('hora');

  return (
    <>
      <Header
        title="Tarifas"
        description="Edita los precios por franja horaria y por temporada"
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-color">
          <TabButton
            active={tab === 'hora'}
            onClick={() => setTab('hora')}
            icon={Clock}
            label="Por franja horaria"
          />
          <TabButton
            active={tab === 'temporada'}
            onClick={() => setTab('temporada')}
            icon={Calendar}
            label="Por temporada"
          />
        </div>

        {/* Contenido */}
        <div className="pt-2">
          {tab === 'hora' && <TarifasPorHora />}
          {tab === 'temporada' && <TarifasPorTemporada />}
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
  icon: typeof Clock;
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
