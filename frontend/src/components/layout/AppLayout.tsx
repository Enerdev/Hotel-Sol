import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Sidebar móvil - overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Fondo oscuro */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Panel */}
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior móvil */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-bg-surface border-b border-border-color sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="size-9 flex items-center justify-center rounded-md hover:bg-bg-elevated transition text-text-secondary"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="13.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-text-primary">Hotel System</p>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
