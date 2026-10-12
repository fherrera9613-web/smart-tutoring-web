# SMART Tutoring Center · Frontend React

React + Vite frontend para la Web API REST del proyecto SMART Tutoring Center.

```bash
npm install
npm run dev   # http://localhost:5173
```

- `src/pages/Login.jsx`: solicita credenciales a la API y conserva el JWT durante la sesión del navegador.
- `src/pages/Dashboard.jsx`: vistas por rol y operaciones conectadas para estudiantes, profesores, familias/cobros y tutorías.
- `src/services/api.js`: cliente HTTP, envío del Bearer token y tratamiento de errores.
- `src/styles/global.css`: estilos responsive del acceso y del panel.

## Configuración

Define `VITE_API_URL` como la URL base de ASP.NET Core (sin `/` final). Si no se define, el cliente usa `http://localhost:5000`.

```bash
cp .env.example .env.local
npm install
npm run dev
```

El backend debe permitir por CORS el origen local de Vite. El acceso normal no simula autenticación ni usa datos de respaldo: si la API no está disponible, presenta el error al usuario.

En modo de desarrollo (`npm run dev`) se puede entrar al panel de prueba con `admin@correo.com` y `1234`. Este acceso usa datos locales de muestra, no realiza escrituras y no se incluye en compilaciones de producción.

## Contrato REST esperado

El avance de Fase 2 fija explícitamente el CRUD de estudiantes en `/api/estudiantes`. El cliente usa estas rutas para cubrir los módulos acordados:

| Operación | Ruta |
| --- | --- |
| Iniciar sesión | `POST /api/auth/login` |
| Listar, crear, actualizar estudiantes | `GET/POST /api/estudiantes`, `PUT /api/estudiantes/{id}` |
| Desactivar estudiante conservando historial | `PUT /api/estudiantes/{id}` con `activo: false` |
| Listar tutores y disponibilidad | `GET /api/tutores` |
| Listar familias | `GET /api/familias` |
| Consultar y registrar pagos | `GET/POST /api/pagos` |
| Consultar agenda semanal y programar sesión | `GET/POST /api/sesiones` |

Para el login se envía `{ "correo", "contrasena" }`; la respuesta debe incluir un JWT (`token`, `accessToken` o `jwt`) y el rol del usuario, ya sea en el objeto de usuario o en los claims del token. El cliente envía `Authorization: Bearer <token>` a las rutas protegidas. Acepta respuestas de listas como un arreglo o dentro de `items`, `data` o `result`.

Las rutas de tutores, familias, pagos y sesiones son la convención REST usada por estas vistas; el documento de Fase 2 no fija sus rutas ni los DTO exactos. Si el backend acordó nombres diferentes, actualiza el mapeo en `src/services/api.js` al contrato real antes de integrar. El servidor sigue siendo responsable de autorización, validación de reglas de negocio y conflictos de horario.
