import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hotel, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { ApiError } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error de conexión. ¿El servidor está corriendo?');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-base via-bg-surface to-bg-base">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mb-4">
            <Hotel className="size-8 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Hotel</h1>
          <p className="text-sm text-text-secondary mt-1">Sistema de gestión operativa</p>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={submitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" isLoading={submitting}>
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>

            {/* Hint de credenciales (solo en dev) */}
            {import.meta.env.DEV && (
              <div className="mt-6 pt-4 border-t border-border-color">
                <p className="text-xs text-text-muted mb-2">Credenciales de prueba:</p>
                <div className="space-y-1 text-xs text-text-secondary font-mono">
                  <p>admin / admin123 (admin)</p>
                  <p>recep1 / recep123 (recepción)</p>
                  <p>limpieza1 / limp123 (limpieza)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text-muted mt-6">
          Hotel Management System · v0.1
        </p>
      </div>
    </div>
  );
}
