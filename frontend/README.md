# 🎨 Frontend — Hotel System

Aplicación React conectada al backend.

## 📦 Stack

- **React 18** + **TypeScript**
- **Vite 6** (dev server super rápido)
- **Tailwind CSS v4** (estilos)
- **shadcn/ui** patterns (componentes UI)
- **React Router v6**
- **Socket.IO Client** (tiempo real)
- **Sonner** (notificaciones toast)
- **Lucide React** (iconos)

## 🚀 Setup inicial (primera vez)

### Pre-requisito: el backend debe estar corriendo

Antes de arrancar el frontend, asegúrate de que el backend está activo en otra terminal con su `npm run dev` mostrando el banner.

### 1. Instalar dependencias

Abre una **NUEVA terminal en VSCode** (no la del backend, que debe seguir corriendo):

```bash
cd frontend
npm install
```

⏱️ Tarda 2-3 minutos. Verás barras de progreso.

### 2. Crear archivo `.env`

```powershell
Copy-Item .env.example .env
```

> En CMD: `copy .env.example .env`

Por defecto apunta al backend en `http://localhost:3000/api`. No necesitas tocar nada si el backend está en el mismo PC.

### 3. Arrancar el frontend

```bash
npm run dev
```

Verás algo así:

```
  VITE v6.3.5  ready in 543 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4. Probar el login

Abre http://localhost:5173/ en tu navegador.

Deberías ver la pantalla de login. Prueba con:

| Usuario     | Contraseña  | Verás como...    |
|-------------|-------------|------------------|
| `admin`     | `admin123`  | Administrador    |
| `recep1`    | `recep123`  | Recepcionista    |
| `limpieza1` | `limp123`   | Personal Limpieza |

Si entra correctamente → ✅ frontend conectado al backend.

## 🏗️ Estructura del código

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .env                  ← URL del backend (no subir a git)
└── src/
    ├── main.tsx          ← entry point
    ├── App.tsx           ← rutas principales
    ├── index.css         ← tema y variables CSS
    ├── types/
    │   └── index.ts      ← tipos espejo del backend
    ├── lib/
    │   └── cn.ts         ← helper de classes
    ├── services/
    │   ├── api.ts        ← cliente HTTP (fetch + JWT)
    │   └── socket.ts     ← cliente Socket.IO
    ├── context/
    │   └── AuthContext.tsx  ← login/logout/roles
    ├── components/
    │   └── ui/           ← Button, Input, Card, Label
    └── pages/
        ├── Login.tsx
        └── Dashboard.tsx
```

## 🐛 Problemas comunes

### "Failed to fetch" al hacer login

→ El backend no está corriendo. Inicia `npm run dev` en la carpeta `backend/`.

### "CORS error" en consola

→ Verifica que `CORS_ORIGIN=http://localhost:5173` esté en el `.env` del backend.

### El login no acepta admin/admin123

→ No corriste `npm run seed:passwords` en el backend. Ejecuta:
```bash
cd ../backend
npm run seed:passwords
```

### "Cannot find module" al ejecutar npm run dev

→ `npm install` no terminó bien. Borra `node_modules` y `package-lock.json`, vuelve a instalar:
```bash
rm -rf node_modules package-lock.json
npm install
```

### El servidor arrancó pero la página está blanca

→ Abre la consola del navegador (`F12`) y mira los errores. Generalmente es algo del `.env` o el backend caído.

## 🎨 Tema y colores

El tema oscuro usa variables CSS definidas en `src/index.css`:

```css
--color-bg-base: #0a0e1a       /* fondo principal */
--color-bg-surface: #111827    /* cards */
--color-accent: #d4a574        /* dorado, color marca */
--color-text-primary: #e5e7eb  /* texto principal */
```

Para cambiar la paleta entera, edita esas variables. Los componentes usan clases Tailwind como `bg-bg-base`, `text-text-primary`, `border-border-color`, etc.
