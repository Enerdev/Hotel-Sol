# 🏨 Hotel Management System

Sistema integral de gestión hotelera con 3 roles diferenciados (Administrador, Recepción, Limpieza).

## 📊 Estado del proyecto

- ✅ **Fase 1** — Base de datos MySQL con datos reales del cliente
- ✅ **Fase 2** — Backend Node.js + Express + Socket.IO
- 🚧 **Fase 3** — Frontend React (setup base + login funcional)

## 🏗️ Arquitectura

### Backend
- **Node.js 20+** con **TypeScript 5**
- **Express 4** para API REST
- **MySQL 2** con pool de conexiones
- **Socket.IO** para tiempo real
- **JWT** para autenticación
- **Zod** para validación de datos

### Frontend
- **React 18** con **TypeScript**
- **Vite** para desarrollo rápido
- **Tailwind CSS v4** para estilos
- **React Router** para navegación
- **Socket.IO Client** para tiempo real
- **Radix UI** para componentes accesibles

### Base de datos
- **MySQL 8+** con estructura normalizada
- **25 habitaciones** de ejemplo
- **6 usuarios** de prueba
- **Datos realistas** del cliente

## 📁 Estructura del proyecto

```
hotel-system/
├── database/           # Scripts SQL y documentación BD
│   ├── schema.sql      # Estructura de tablas
│   ├── seed.sql        # Datos de prueba
│   └── README.md       # Guía de BD
├── backend/            # API REST + WebSockets
│   ├── src/
│   │   ├── config/     # Configuración (BD, env)
│   │   ├── middleware/ # Middlewares Express
│   │   ├── models/     # Modelos de datos
│   │   ├── routes/     # Endpoints API
│   │   ├── sockets/    # Config Socket.IO
│   │   ├── types/      # Tipos TypeScript
│   │   ├── utils/      # Utilidades
│   │   └── index.ts    # Punto de entrada
│   ├── package.json
│   └── tsconfig.json
└── frontend/           # Aplicación React
    ├── src/
    │   ├── components/ # Componentes reutilizables
    │   ├── context/    # Contextos React
    │   ├── hooks/      # Hooks personalizados
    │   ├── lib/        # Utilidades
    │   ├── pages/      # Páginas/routes
    │   ├── services/   # APIs y servicios
    │   └── types/      # Tipos TypeScript
    ├── package.json
    ├── vite.config.ts
    └── index.html
```

## 🚀 Inicio rápido

### Prerrequisitos
- **Node.js 20+**
- **MySQL 8+** (XAMPP, Laragon, o instalación nativa)
- **Git**
- **VSCode** (recomendado: abre `hotel-system.code-workspace`)

### 1. Clonar y configurar

### 1. Clonar y instalar dependencias
```bash
git clone <repo-url>
cd hotel-system

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar base de datos
```bash
# Crear BD 'hotel_system' en MySQL
# Importar schema.sql y seed.sql desde /database/
```

### 3. Configurar variables de entorno
```bash
# Backend
cd backend
cp .env.example .env
# Editar .env con credenciales MySQL

# Frontend
cd ../frontend
cp .env.example .env
# El .env.example ya tiene valores por defecto
```

### 4. Activar contraseñas de usuarios
```bash
cd backend
npm run seed:passwords
```

### 5. Arrancar servicios

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Acceder
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api/health

## 🔑 Credenciales de prueba

| Usuario     | Contraseña  | Rol             | Descripción |
|-------------|-------------|-----------------|-------------|
| `admin`     | `admin123`  | Administrador   | Acceso total |
| `recep1`    | `recep123`  | Recepcionista   | Gestión reservas |
| `limpieza1` | `limp123`   | Limpieza        | Gestión habitaciones |

## 📋 Funcionalidades por rol

### 👑 Administrador
- Dashboard completo con estadísticas
- Gestión de usuarios y roles
- Configuración del sistema
- Reportes avanzados
- Todas las funciones de recepción

### 🏨 Recepcionista
- Dashboard de recepción
- Gestión de reservas y check-in/out
- Gestión de clientes
- Validación de limpieza
- Cobros y facturación

### 🧹 Limpieza
- Dashboard de habitaciones sucias
- Registro de limpieza
- Actualización de estado de habitaciones

## 🛠️ Desarrollo

### Comandos útiles

```bash
# Verificar configuración completa
npm run check-setup

# Instalar todas las dependencias
npm run install:all

# Desarrollo (backend + frontend simultáneo)
npm run dev

# Solo backend
npm run dev:backend

# Solo frontend
npm run dev:frontend

# Build completo
npm run build

# Linting completo
npm run lint

# Limpiar dependencias y builds
npm run clean

# Backend
cd backend
npm run dev          # Desarrollo con hot reload
npm run build        # Compilar para producción
npm run start        # Ejecutar build de producción
npm run test:db      # Verificar BD
npm run seed:passwords  # Activar contraseñas de usuarios

# Frontend
cd frontend
npm run dev          # Desarrollo con Vite
npm run build        # Build de producción
npm run preview      # Vista previa del build
npm run lint         # Verificar TypeScript + ESLint
npm run lint:fix     # Corregir problemas automáticamente
```

### Calidad de código

- **ESLint** - Linting y reglas de código
- **Prettier** - Formateo automático
- **EditorConfig** - Configuración consistente del editor
- **TypeScript** - Verificación de tipos estricta

### Estructura de commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: cambios de formato/código
refactor: refactorización
test: agregar tests
chore: cambios de build/config
```

## 📚 Documentación detallada

- [📊 Base de datos](./database/README.md)
- [🔧 Backend](./backend/README.md)
- [⚛️ Frontend](./frontend/README.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: descripción'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y propiedad del cliente.
