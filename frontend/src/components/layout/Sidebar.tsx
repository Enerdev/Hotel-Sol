import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  BedDouble,
  Users,
  Calendar,
  DollarSign,
  UsersRound,
  Package,
  BarChart3,
  Wallet,
  FileText,
  Settings,
  LogOut,
  Hotel,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import type { Rol } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Rol[];
  rolesSecundarios?: ('recepcionista' | 'limpieza')[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'recepcionista', 'limpieza'] },
  { to: '/limpieza', label: 'Limpieza', icon: Sparkles, roles: ['admin', 'recepcionista', 'limpieza'], rolesSecundarios: ['limpieza'] },
  { to: '/habitaciones', label: 'Habitaciones', icon: BedDouble, roles: ['admin', 'recepcionista'], rolesSecundarios: ['recepcionista'] },
  { to: '/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'recepcionista'], rolesSecundarios: ['recepcionista'] },
  { to: '/reservas', label: 'Reservas', icon: Calendar, roles: ['admin', 'recepcionista'], rolesSecundarios: ['recepcionista'] },
  { to: '/productos', label: 'Productos & Ventas', icon: Package, roles: ['admin', 'recepcionista'], rolesSecundarios: ['recepcionista'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin', 'recepcionista'] },
  { to: '/tarifas', label: 'Tarifas', icon: DollarSign, roles: ['admin'] },
  { to: '/personal', label: 'Personal', icon: UsersRound, roles: ['admin'] },
  { to: '/caja', label: 'Caja Contable', icon: Wallet, roles: ['admin'] },
  { to: '/facturacion', label: 'Facturación', icon: FileText, roles: ['admin', 'recepcionista'] },
  { to: '/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => {
    if (item.roles.includes(user.rol)) return true;
    if (user.rol_secundario && item.rolesSecundarios?.includes(user.rol_secundario)) return true;
    return false;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const rolLabel = user.rol_secundario
    ? `${user.rol} + ${user.rol_secundario}`
    : user.rol;

  return (
    <aside className="w-60 bg-bg-surface border-r border-border-color flex flex-col shrink-0 h-full md:h-auto md:min-h-screen">
      {/* Logo / Encabezado */}
      <div className="px-5 py-5 border-b border-border-color">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
            <Hotel className="size-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate">Hotel System</p>
            <p className="text-xs text-text-muted truncate capitalize">{rolLabel}</p>
          </div>
          {/* Botón cerrar en móvil */}
          {onClose && (
            <button type="button" onClick={onClose}
              className="size-8 flex items-center justify-center rounded-md hover:bg-bg-elevated transition text-text-secondary md:hidden shrink-0"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Usuario / Logout */}
      <div className="p-3 border-t border-border-color">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <div className="size-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-secondary text-sm font-medium shrink-0">
            {user.nombres?.[0]?.toUpperCase() ?? user.username[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-primary truncate">{user.nombres ?? user.username}</p>
            <p className="text-xs text-text-muted truncate">@{user.username}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-danger/10 hover:text-danger transition"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
