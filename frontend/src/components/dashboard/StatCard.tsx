import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
  /** Texto pequeño debajo del valor (ej: "+3 desde ayer") */
  hint?: string;
  /** Si se pasa, la card es clickeable */
  onClick?: () => void;
  loading?: boolean;
}

const toneStyles: Record<Tone, { iconBg: string; iconText: string; valueText: string }> = {
  default: {
    iconBg: 'bg-bg-elevated',
    iconText: 'text-text-secondary',
    valueText: 'text-text-primary',
  },
  success: {
    iconBg: 'bg-success/10',
    iconText: 'text-success',
    valueText: 'text-text-primary',
  },
  warning: {
    iconBg: 'bg-warning/10',
    iconText: 'text-warning',
    valueText: 'text-text-primary',
  },
  danger: {
    iconBg: 'bg-danger/10',
    iconText: 'text-danger',
    valueText: 'text-text-primary',
  },
  info: {
    iconBg: 'bg-info/10',
    iconText: 'text-info',
    valueText: 'text-text-primary',
  },
  accent: {
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
    valueText: 'text-text-primary',
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  onClick,
  loading,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-surface border border-border-color rounded-lg p-5',
        'transition-all',
        isClickable && 'cursor-pointer hover:border-accent/50 hover:bg-bg-surface-2'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-text-secondary">{label}</p>
          {loading ? (
            <div className="h-9 w-20 rounded bg-bg-elevated animate-pulse mt-1" />
          ) : (
            <p className={cn('text-3xl font-semibold mt-1 tabular-nums', styles.valueText)}>
              {value}
            </p>
          )}
          {hint && !loading && (
            <p className="text-xs text-text-muted mt-1">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            'size-10 rounded-lg flex items-center justify-center shrink-0',
            styles.iconBg
          )}
        >
          <Icon className={cn('size-5', styles.iconText)} />
        </div>
      </div>
    </div>
  );
}
