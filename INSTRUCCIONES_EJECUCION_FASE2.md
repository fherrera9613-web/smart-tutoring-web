# Instrucciones de ejecución - Fase 2

Este archivo permite levantar SMART Tutoring Center desde cero en una computadora de evaluación.

## Requisitos

- Git
- .NET SDK 10
- Node.js 18 o superior y npm
- PostgreSQL 17
- PowerShell

## 1. Clonar el repositorio

```powershell
git clone https://github.com/fherrera9613-web/smart-tutoring-web.git
cd smart-tutoring-web
```

## 2. Crear la base de datos

Si PostgreSQL 17 está instalado en la ruta predeterminada de Windows:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE smart_tutoring_db;"
```

PostgreSQL solicitará la contraseña local del usuario `postgres`.

Si la base `smart_tutoring_db` ya existe, este paso se omite.

## 3. Restaurar y configurar el backend

```powershell
cd backend\SmartTutoring.Api
dotnet restore
```

Configurar la cadena de conexión usando la contraseña PostgreSQL del equipo donde se ejecutará el proyecto:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=smart_tutoring_db;Username=postgres;Password=SU_PASSWORD_POSTGRES"
```

Generar una clave JWT local de 256 bits y guardarla en User Secrets:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$jwtKey = [Convert]::ToBase64String($bytes)
dotnet user-secrets set "Jwt:Key" $jwtKey
```

Configurar emisor y audiencia:

```powershell
dotnet user-secrets set "Jwt:Issuer" "SmartTutoring.Api"
dotnet user-secrets set "Jwt:Audience" "SmartTutoring.Frontend"
```

Configurar el usuario administrador inicial de la base nueva:

```powershell
dotnet user-secrets set "SeedAdmin:Email" "admin@smarttutoring.local"
dotnet user-secrets set "SeedAdmin:Password" "admin123"
```

Los secretos anteriores quedan únicamente en la computadora local y no se guardan en GitHub.

## 4. Aplicar las migraciones de Entity Framework Core

Primero comprobar si `dotnet-ef` está disponible:

```powershell
dotnet ef --version
```

Si el comando no existe, instalar la herramienta compatible con el proyecto:

```powershell
dotnet tool install --global dotnet-ef --version 10.0.12
```

Aplicar el esquema a PostgreSQL:

```powershell
dotnet ef database update
```

## 5. Ejecutar el backend

Desde `backend\SmartTutoring.Api`:

```powershell
dotnet run
```

El backend quedará disponible en:

```text
http://localhost:5008
```

Swagger UI:

```text
http://localhost:5008/swagger
```

No cerrar esta terminal mientras se revisa el sistema.

## 6. Ejecutar el frontend

Abrir una segunda PowerShell desde la raíz del repositorio:

```powershell
cd frontend
npm ci
npm run dev
```

El frontend quedará disponible en:

```text
http://localhost:5173
```

## 7. Iniciar sesión

En una base de datos creada desde cero con estas instrucciones:

```text
Correo: admin@smarttutoring.local
Contraseña: admin123
```

Esta cuenta es exclusivamente de desarrollo local.

## 8. Verificación rápida

- Abrir `http://localhost:5173` y realizar login.
- Abrir `http://localhost:5008/swagger` para revisar la API REST.
- En pgAdmin consultar la base `smart_tutoring_db` para verificar la persistencia.
- En GitHub revisar el historial de commits y la pestaña Actions.

## Flujo técnico

```text
React/Vite
   ↓ HTTP + JSON
ASP.NET Core Web API
   ↓ Controllers / JWT / reglas de negocio
Entity Framework Core
   ↓ Npgsql
PostgreSQL
```

## Nota de seguridad

No se incluyen contraseñas PostgreSQL reales ni claves JWT del equipo de desarrollo. Cada evaluador configura sus propios User Secrets locales siguiendo estas instrucciones.
