import type { ReactNode } from 'react';
import { NotificacionesBell } from './NotificacionesBell';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="px-8 py-5 border-b border-border-color bg-bg-surface/50 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-text-secondary mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {actions}
          <NotificacionesBell />
        </div>
      </div>
    </header>
  );
}
