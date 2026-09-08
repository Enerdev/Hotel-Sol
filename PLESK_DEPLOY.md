# Despliegue en Plesk — todo en un solo subdominio

El frontend y el backend se sirven desde la **misma aplicación Node.js**, en el
mismo subdominio (por ejemplo `hotel-sol.lapreperu.com`). Express sirve la API
en `/api/*` y el build del frontend para todo lo demás. Ya no se usa un
subdominio `api.*` separado.

La base de datos MySQL (`lapreperu_hotel`) ya está creada en Plesk con el
esquema y los datos cargados — no hace falta volver a importarlos.

## 1. Subir el proyecto

Clona o sube el repositorio completo (sin `node_modules/`, `dist/` ni
`backend/public/`; se generan en el servidor). Ya no existe una carpeta
`database/` — el esquema y los seeds solo viven en la BD de Plesk.

## 2. Configurar la app Node.js en Plesk

- **Application root**: `/hotel-sol.lapreperu.com` (o el nombre de carpeta del
  dominio en tu servidor)
- **Application URL**: `https://hotel-sol.lapreperu.com`
- **Document root**: `backend/public` (subcarpeta del Application root — así
  se cumple la regla de Plesk de que el Document root esté dentro del
  Application root)
- **Startup file**: `backend/dist/index.js`
- **Node.js**: versión 20 o superior
- **Application mode**: `production`

## 3. Variables de entorno

Configura en el panel de Node.js de Plesk (o en `backend/.env` si prefieres
archivo):

```env
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://hotel-sol.lapreperu.com

DB_HOST=localhost
DB_PORT=3306
DB_USER=usuario_mysql
DB_PASSWORD=contrasena_mysql_rotada
DB_NAME=lapreperu_hotel

JWT_SECRET=clave_generada_con_crypto_randomBytes_64
JWT_REFRESH_SECRET=otra_clave_diferente_igual_de_larga
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
BCRYPT_ROUNDS=10
```

No reutilices las claves que ya estuvieron expuestas antes; genera nuevas con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 4. Instalar y compilar

Desde la terminal de Plesk, en la raíz del proyecto:

```bash
npm install
npm run build
```

Este `build` unificado hace tres cosas en orden:

1. Compila el backend (`backend/dist`).
2. Compila el frontend (`frontend/dist`).
3. Copia el contenido de `frontend/dist/` dentro de `backend/public/`, que es
   justo la carpeta que Express sirve como estático y que Plesk usa como
   Document root.

Reinicia la aplicación Node.js desde Plesk después del build.

## 5. Comprobaciones

- `https://hotel-sol.lapreperu.com/` → muestra el login (servido por Express
  desde `backend/public/index.html`).
- `https://hotel-sol.lapreperu.com/api/health` → responde `status: ok`.
- Al recargar una ruta interna del SPA (por ejemplo `/reservas`) no debe dar
  404 — el catch-all de Express sirve `index.html` para cualquier ruta que no
  empiece con `/api`.
- El login funciona con los usuarios ya cargados en la BD de Plesk.
- No debería aparecer ningún error de CORS en la consola del navegador (mismo
  origen para frontend y backend).

## Notas

- Si en algún momento vuelves a necesitar separar frontend y backend en
  subdominios distintos, la lógica de `frontend/src/services/api.ts` y
  `socket.ts` ya tiene un *fallback* a rutas relativas — solo tendrías que
  volver a definir `VITE_API_URL` y `VITE_SOCKET_URL` explícitos y quitar el
  bloque de estático + catch-all de `backend/src/index.ts`.
