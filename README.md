# SMART Tutoring Center

Sistema web de gestión académica y administrativa desarrollado para **SMART Tutoring Center** como proyecto de la asignatura **Diseño de Sistemas en Internet**.

## Objetivo

Digitalizar procesos básicos del centro de tutorías mediante una aplicación web con separación estricta entre frontend, backend y persistencia. El sistema permite administrar estudiantes, tutores, materias, sesiones, asistencia, seguimiento académico, pagos y usuarios con control de acceso por roles.

## Estado de la Fase 2

La Fase 2 cuenta con:

- Frontend funcional en localhost.
- Backend ASP.NET Core Web API funcional.
- API REST documentada con OpenAPI y Swagger UI.
- Persistencia real en PostgreSQL mediante Entity Framework Core y Npgsql.
- Autenticación JWT y autorización por roles.
- Reglas de negocio para sesiones, asistencia, seguimiento académico y pagos.
- Evidencias de integración Frontend ↔ Backend ↔ Base de Datos.
- Workflow de GitHub Actions para validar automáticamente el build de frontend y backend.

## Arquitectura

```text
Usuario
  ↓
React + Vite
  ↓ HTTP / JSON
ASP.NET Core Web API
  ↓
Controllers + DTOs + reglas de negocio + JWT
  ↓
Entity Framework Core / DbContext
  ↓
Npgsql
  ↓
PostgreSQL
```

El frontend **no accede directamente a PostgreSQL**. Todas las operaciones pasan por la API, donde se aplican autenticación, autorización y reglas de negocio.

## Tecnologías

### Frontend

- React 18
- Vite 5
- JavaScript
- HTML5 / CSS3

### Backend

- .NET 10
- ASP.NET Core Web API
- Entity Framework Core 10
- JWT Bearer Authentication
- OpenAPI
- Swagger UI

### Datos

- PostgreSQL 17
- Npgsql.EntityFrameworkCore.PostgreSQL

### Desarrollo y control de versiones

- Git
- GitHub
- GitHub Actions
- Figma

## Estructura principal del repositorio

```text
smart-tutoring-web/
├── backend/
│   └── SmartTutoring.Api/
│       ├── Controllers/
│       ├── Data/
│       ├── Models/
│       │   ├── DTOs/
│       │   └── Entities/
│       ├── Services/
│       ├── Migrations/
│       └── Program.cs
├── frontend/
│   ├── src/
│   │   ├── sections/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── .github/
    └── workflows/
```

## Roles

### Administrador

Puede acceder a las funciones administrativas del sistema, incluida la gestión de usuarios.

### Personal administrativo

Gestiona estudiantes, tutores, materias, sesiones y pagos según los permisos definidos en la API.

### Tutor

Consulta únicamente sus sesiones y puede registrar asistencia, seguimiento académico y completar sesiones cuando se cumplen las reglas establecidas.

## Módulos implementados

- Autenticación.
- Estudiantes.
- Tutores.
- Materias.
- Asignación Tutor–Materia.
- Sesiones de tutoría.
- Asistencia.
- Seguimiento académico.
- Historial académico.
- Pagos e historial de pagos.
- Usuarios y roles.

## Reglas de negocio principales

### Sesiones

- El tutor debe estar asociado a la materia que impartirá.
- La hora de finalización debe ser posterior a la hora de inicio.
- Un tutor no puede tener sesiones activas superpuestas en la misma fecha.
- Las sesiones canceladas no bloquean el horario.
- Solo las sesiones programadas pueden reprogramarse.
- Una sesión completada no puede cancelarse.

### Registros académicos

- La asistencia solo puede registrarse desde la hora de inicio de la sesión.
- El Tutor solo puede operar sobre sesiones que le pertenecen.
- El seguimiento académico solo puede registrarse después de la hora de finalización.
- El seguimiento requiere asistencia previa con estado `Presente`.
- Una sesión con asistencia `Presente` requiere seguimiento antes de pasar a `Completada`.
- Las validaciones temporales utilizan la zona horaria de Managua.

### Pagos

- La duración se registra en minutos.
- Solo se aceptan intervalos múltiplos de 15 minutos.
- Tarifa base: USD 10 por hora.
- Tipo de cambio utilizado por el proyecto: C$ 36.6243 por USD.
- El backend calcula el monto final; el frontend no envía un monto arbitrario.
- El cálculo usa la tarifa exacta y redondea únicamente el valor monetario final a dos decimales.

## Autenticación y autorización

El login se realiza mediante:

```text
POST /api/auth/login
```

Si las credenciales son válidas, el backend genera un **JWT (JSON Web Token)** firmado con HMAC SHA-256 y con una vigencia de dos horas.

El token incluye claims de identidad como:

- identificador del usuario (`sub`),
- correo electrónico,
- rol,
- identificador único del token (`jti`).

La contraseña **no se almacena dentro del JWT**. Las contraseñas se verifican mediante `PasswordHasher` contra el hash almacenado.

Los endpoints protegidos utilizan `[Authorize]` y, cuando corresponde, restricciones por rol con `[Authorize(Roles = ...)]`.

## Persistencia

Entity Framework Core funciona como ORM y relaciona las entidades C# con las tablas de PostgreSQL. El `SmartTutoringDbContext` concentra la configuración del modelo y las relaciones. Npgsql es el proveedor que permite la comunicación entre EF Core y PostgreSQL.

## API y Swagger

Con el backend en ejecución, la documentación está disponible en:

```text
http://localhost:5008/swagger
```

La especificación OpenAPI se expone en desarrollo y Swagger UI permite inspeccionar los endpoints, parámetros, modelos y respuestas.

## Requisitos para desarrollo local

- .NET SDK 10
- Node.js compatible con Vite 5
- npm
- PostgreSQL 17
- Git

## Configuración del backend

Por seguridad, la cadena de conexión y la clave JWT no se almacenan en el repositorio. En desarrollo se utilizan **User Secrets**.

Desde:

```powershell
cd backend\SmartTutoring.Api
```

configurar los valores correspondientes al entorno local:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=smart_tutoring_db;Username=postgres;Password=TU_PASSWORD"
dotnet user-secrets set "Jwt:Key" "TU_CLAVE_BASE64"
dotnet user-secrets set "Jwt:Issuer" "SmartTutoring.Api"
dotnet user-secrets set "Jwt:Audience" "SmartTutoring.Frontend"
```

> No subir contraseñas, cadenas de conexión reales ni claves JWT al repositorio.

## Ejecutar el backend

```powershell
cd backend\SmartTutoring.Api
dotnet restore
dotnet run
```

Backend de desarrollo:

```text
http://localhost:5008
```

## Ejecutar el frontend

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Frontend de desarrollo:

```text
http://localhost:5173
```

## Compilar el proyecto

### Backend

```powershell
dotnet build .\backend\SmartTutoring.Api\SmartTutoring.Api.csproj
```

### Frontend

```powershell
npm --prefix .\frontend run build
```

## Integración continua

El repositorio contiene un workflow de **GitHub Actions** que valida automáticamente:

1. restauración y compilación del backend .NET;
2. instalación reproducible de dependencias y build del frontend React/Vite.

Esto permite detectar errores de compilación antes de considerar una versión estable.

## Flujo de una operación

Ejemplo al consultar estudiantes:

```text
1. El usuario abre Estudiantes en React.
2. React envía una solicitud HTTP a la API.
3. ASP.NET Core recibe la solicitud en el Controller correspondiente.
4. Se validan autenticación/autorización cuando aplica.
5. Entity Framework Core construye la consulta.
6. Npgsql la ejecuta contra PostgreSQL.
7. La API devuelve la respuesta en JSON.
8. React actualiza la interfaz.
```

## Seguridad y alcance

- Contraseñas almacenadas como hash.
- Autenticación mediante JWT.
- Autorización por roles en el backend.
- CORS restringido a los orígenes de desarrollo definidos.
- Secretos de desarrollo fuera del repositorio.
- Validaciones de negocio aplicadas en el servidor.

El módulo de pagos corresponde al alcance administrativo del piloto y **no representa facturación fiscal ni un sistema contable completo**.

## Documentación complementaria

La documentación académica de Fase 1 y Fase 2 contiene requisitos, casos de uso, modelo navegacional UWE, mapa de navegación, arquitectura, diagramas de clases y entidad–relación, evidencias de integración y borrador del Manual de Usuario.

## Proyecto académico

Proyecto desarrollado para la asignatura **Diseño de Sistemas en Internet** como parte del proceso académico de Ingeniería en Sistemas.
