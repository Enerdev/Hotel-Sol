# 🔧 Backend — Hotel System

API REST + WebSockets para el sistema de gestión hotelera.

## 📦 Stack

- **Node.js 20+** + **TypeScript 5**
- **Express 4** (framework HTTP)
- **MySQL 2** (driver de BD con pool de conexiones)
- **JWT** (autenticación)
- **bcrypt** (hash de contraseñas)
- **Socket.IO** (tiempo real)
- **Zod** (validación de inputs)
- **tsx** (correr TypeScript directo, sin compilar)

## 🚀 Inicio rápido (5 pasos)

### 1. Asegúrate de tener importada la BD

Antes de empezar, la BD `hotel_system` debe existir y tener datos. Si no, ve a [`../database/README.md`](../database/README.md) primero.

### 2. Instalar dependencias

Abre la terminal de VSCode (`Ctrl + ñ` en español, o `Ctrl + ` ` en inglés) en la carpeta del proyecto y ejecuta:

```bash
cd backend
npm install
```

Esto instalará todas las dependencias en `node_modules/` (~3 minutos la primera vez).

### 3. Crear archivo `.env`

```bash
# Copia la plantilla
cp .env.example .env
```

> En Windows (PowerShell): `Copy-Item .env.example .env`
> En Windows (CMD): `copy .env.example .env`

Después abre el `.env` con VSCode y revisa los valores. Por defecto está pensado para **XAMPP con configuración por defecto**:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=         ← vacío para XAMPP por defecto
DB_NAME=hotel_system
```

⚠️ **Importante:** cambia los valores de `JWT_SECRET` y `JWT_REFRESH_SECRET` por strings aleatorios largos. Puedes generar uno con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Pega el resultado en `JWT_SECRET`. Repite para `JWT_REFRESH_SECRET`.

### 4. Activar las contraseñas

La BD viene con `password_hash` placeholder (los logins no funcionan todavía). Para activarlos:

```bash
npm run seed:passwords
```

Verás:

```
🔐 Generando hashes bcrypt para los usuarios de prueba...

  ✅ admin        → contraseña activada
  ✅ recep1       → contraseña activada
  ✅ recep2       → contraseña activada
  ✅ recep3       → contraseña activada
  ✅ limpieza1    → contraseña activada
  ✅ limpieza2    → contraseña activada
```

### 5. Probar conexión a BD (opcional pero recomendado)

```bash
npm run test:db
```

Esto verifica que la BD esté bien y los conteos coincidan.

### 6. Arrancar el servidor

```bash
npm run dev
```

Si todo está bien, verás:

```
✅ Conectado a MySQL: localhost:3306/hotel_system

╔════════════════════════════════════════════╗
║   🏨 Hotel System Backend                  ║
╠════════════════════════════════════════════╣
║   📡 API:        http://localhost:3000     ║
║   🔌 Socket.IO:  http://localhost:3000     ║
║   🌍 Entorno:    development               ║
╚════════════════════════════════════════════╝
```

🎉 **¡Tu backend está corriendo!**

## 🧪 Probar el backend

### Opción 1 — Desde el navegador (solo GET sin auth)

Abre: http://localhost:3000/api/health

Deberías ver:

```json
{
  "status": "ok",
  "env": "development",
  "timestamp": "2026-05-01T12:34:56.789Z"
}
```

### Opción 2 — Con Thunder Client (recomendado)

1. En VSCode, instala la extensión **"Thunder Client"** (de Ranga Vadhineni)
2. Abre Thunder Client (rayo a la izquierda)
3. **Probar el login:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```
   - Click "Send"
4. Si todo va bien, verás:
   ```json
   {
     "accessToken": "eyJhbGc...",
     "refreshToken": "eyJhbGc...",
     "user": {
       "id": 1,
       "username": "admin",
       "rol": "admin",
       ...
     }
   }
   ```
5. **Copia el `accessToken`** para usarlo en otras requests
6. **Probar listar habitaciones:**
   - Method: `GET`
   - URL: `http://localhost:3000/api/habitaciones`
   - Tab "Auth" → Bearer → pega el token
   - Click "Send"
   - Deberías ver las 25 habitaciones

### Opción 3 — Con cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Listar habitaciones (cambia TOKEN por el accessToken recibido)
curl http://localhost:3000/api/habitaciones \
  -H "Authorization: Bearer TOKEN"
```

## 📋 Endpoints disponibles

### 🔐 Autenticación

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/auth/login` | Iniciar sesión | público |
| POST | `/api/auth/refresh` | Renovar accessToken | público |
| GET | `/api/auth/me` | Datos del usuario actual | autenticado |

### 🏨 Habitaciones

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/habitaciones` | Listar (limpieza solo ve sucias) | autenticado |
| GET | `/api/habitaciones/dashboard` | Stats del dashboard | admin/recepción |
| GET | `/api/habitaciones/:id` | Detalle (incluye camas) | autenticado |

### 👥 Clientes

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/clientes/buscar?q=...` | Buscar por nombre/DNI | admin/recepción |
| GET | `/api/clientes/frecuentes` | Listar frecuentes | admin/recepción |
| GET | `/api/clientes/:id` | Ver cliente | admin/recepción |
| POST | `/api/clientes` | Crear cliente | admin/recepción |
| PUT | `/api/clientes/:id` | Editar | admin/recepción |

### 🧹 Limpieza

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/limpieza/pendientes` | Listar habs por limpiar | autenticado |
| POST | `/api/limpieza/:id/tomar` | Empezar a limpiar | limpieza |
| POST | `/api/limpieza/:id/completar` | Marcar como limpia | limpieza |
| POST | `/api/limpieza/:id/validar` | Validar limpieza | recepción |
| POST | `/api/limpieza/:id/rechazar` | Rechazar (re-limpiar) | recepción |
| GET | `/api/limpieza/stats` | Productividad por empleado | admin/recepción |

### 💰 Tarifas

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/tarifas/franjas` | Listar tarifas por hora | autenticado |
| PUT | `/api/tarifas/franjas/:id` | Editar precio franja | admin |
| GET | `/api/tarifas/temporadas` | Listar temporadas + tarifas | autenticado |
| PUT | `/api/tarifas/temporada-precio/:id` | Editar precio temporada | admin |

### 📅 Reservas

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/reservas` | Listar | admin/recepción |
| GET | `/api/reservas/:id` | Ver detalle | admin/recepción |
| POST | `/api/reservas` | Crear nueva | admin/recepción |
| POST | `/api/reservas/:id/checkout` | Cerrar (dispara limpieza) | admin/recepción |

## 🔌 Eventos Socket.IO

Cliente debe conectar pasando el JWT en el handshake:

```js
const socket = io('http://localhost:3000', {
  auth: { token: accessToken }
});
```

Eventos que el servidor emite:

| Evento | Cuándo | Quién lo recibe |
|--------|--------|-----------------|
| `limpieza:nueva_pendiente` | Una habitación se desocupa | limpieza, admin |
| `limpieza:cambio` | Cambia estado de limpieza | todos los roles |
| `limpieza:lista_para_validar` | Limpiadora terminó | recepción, admin |
| `limpieza:validada` | Recepción validó | todos los roles |
| `limpieza:rechazada` | Recepción rechazó | todos los roles |
| `habitacion:disponible` | Habitación queda lista | broadcast |
| `reserva:creada` | Nueva reserva | broadcast |

## 🐛 Problemas comunes

### `❌ No se pudo conectar a MySQL: connect ECONNREFUSED`
→ XAMPP no está corriendo. Inicia MySQL desde el panel de XAMPP.

### `❌ ER_BAD_DB_ERROR: Unknown database 'hotel_system'`
→ La BD no existe. Importa `schema.sql` + `seed.sql` en phpMyAdmin.

### `❌ ER_ACCESS_DENIED_ERROR`
→ Usuario o contraseña incorrectos en `.env`. XAMPP por defecto usa `root` con contraseña vacía.

### Login devuelve `401 Usuario o contraseña incorrectos`
→ No corriste `npm run seed:passwords`. Ejecútalo y reintenta.

### Error TypeScript: `Cannot find module '...'`
→ Ejecuta `npm install` de nuevo. Si persiste, borra `node_modules` y vuelve a instalar.

### El servidor arranca pero las requests dan `CORS error`
→ Verifica que `CORS_ORIGIN` en `.env` apunte a la URL de tu frontend (`http://localhost:5173` por defecto en Vite).

## 🏗️ Estructura del código

```
backend/
├── package.json
├── tsconfig.json
├── .env.example          ← plantilla
├── .env                  ← tus credenciales (NO subir a Git)
└── src/
    ├── index.ts          ← entry point, monta todo
    ├── config/
    │   ├── env.ts        ← validación de .env con Zod
    │   └── db.ts         ← pool de MySQL
    ├── types/
    │   └── index.ts      ← tipos compartidos
    ├── middleware/
    │   ├── auth.ts       ← requireAuth, requireRole
    │   └── errorHandler.ts
    ├── routes/           ← endpoints HTTP
    │   ├── auth.routes.ts
    │   ├── habitaciones.routes.ts
    │   ├── clientes.routes.ts
    │   ├── limpieza.routes.ts
    │   ├── tarifas.routes.ts
    │   └── reservas.routes.ts
    ├── models/           ← queries SQL
    │   ├── usuario.model.ts
    │   ├── habitacion.model.ts
    │   ├── cliente.model.ts
    │   └── limpieza.model.ts
    ├── sockets/
    │   └── index.ts      ← Socket.IO setup
    ├── utils/
    │   ├── auth.ts       ← bcrypt + JWT
    │   ├── errors.ts     ← clases de error HTTP
    │   └── asyncHandler.ts
    └── scripts/
        ├── seedPasswords.ts   ← npm run seed:passwords
        └── testDb.ts          ← npm run test:db
```

## 🧰 Comandos disponibles

```bash
npm run dev              # Arranca en modo desarrollo (auto-reload)
npm run build            # Compila TypeScript a JavaScript en dist/
npm start                # Corre el código compilado (producción)
npm run seed:passwords   # Activa los logins de los usuarios de prueba
npm run test:db          # Verifica la conexión y conteos de tablas
```

## 🔒 Seguridad — pendientes para producción

Esto está bien para localhost, pero antes de producción:

- [ ] Generar `JWT_SECRET` y `JWT_REFRESH_SECRET` realmente aleatorios
- [ ] Cambiar todas las contraseñas de prueba
- [ ] Configurar HTTPS (con Caddy/Nginx)
- [ ] Rate limiting (express-rate-limit)
- [ ] Helmet (cabeceras de seguridad)
- [ ] Logs estructurados (pino)
- [ ] Variables sensibles en un secret manager
