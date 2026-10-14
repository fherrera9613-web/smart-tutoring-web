# Arquitectura de SMART Tutoring Center

## 1. Propósito

Este documento describe la arquitectura técnica del piloto funcional de SMART Tutoring Center y mantiene alineados el diseño académico, la implementación del backend y la integración del frontend.

La solución adopta una arquitectura web desacoplada: la interfaz de usuario consume una API REST y la API concentra autenticación, autorización, validaciones, reglas de negocio y persistencia.

## 2. Principios de diseño

Se aplican los siguientes principios:

- Separación entre presentación, lógica de negocio y persistencia.
- API REST como único punto de acceso a los datos desde el frontend.
- Autorización en backend, independientemente de lo que muestre la interfaz.
- Persistencia relacional mediante Entity Framework Core y PostgreSQL.
- Uso de DTOs para controlar los datos expuestos por la API.
- Uso de `async/await` para operaciones de entrada/salida.
- Configuración sensible fuera del repositorio mediante User Secrets.
- Documentación del contrato HTTP mediante OpenAPI y documentación versionada.
- Evolución incremental del piloto sin incorporar módulos fuera del alcance aprobado.

## 3. C4 Nivel 1 — Contexto

Actores principales:

- **Administrador:** administra usuarios y accede a las operaciones administrativas generales.
- **Personal administrativo:** gestiona estudiantes, tutores, materias, sesiones y pagos.
- **Tutor:** consulta las sesiones que le corresponden y registra asistencia y seguimiento académico.

Sistema central:

- **SMART Tutoring Center:** plataforma web para centralizar los principales procesos académicos y administrativos del centro de tutorías.

En el alcance actual no se requiere integrar un sistema externo obligatorio. Si en una evolución posterior se incorpora facturación, notificaciones, correo, almacenamiento en nube u otra plataforma, deberá representarse como sistema externo en el C4 Nivel 1.

## 4. C4 Nivel 2 — Contenedores

### Aplicación web

**Tecnología:** React + Vite.

Responsabilidades:

- Mostrar las vistas según el rol autenticado.
- Capturar y validar datos de interfaz.
- Consumir la API de manera asíncrona.
- Mantener el estado de autenticación del usuario.
- Presentar errores de negocio devueltos por la API.
- Eliminar el token y estado local al cerrar sesión.

### API REST

**Tecnología:** ASP.NET Core Web API sobre .NET 10.

Responsabilidades:

- Autenticar usuarios.
- Emitir y validar tokens JWT.
- Autorizar operaciones por rol.
- Validar reglas de negocio.
- Exponer recursos mediante endpoints REST.
- Ejecutar operaciones de persistencia por medio de EF Core.
- Devolver códigos HTTP coherentes.

### Base de datos

**Tecnología:** PostgreSQL.

Responsabilidades:

- Persistir usuarios.
- Persistir estudiantes.
- Persistir tutores y materias.
- Persistir asignaciones tutor-materia.
- Persistir sesiones.
- Persistir asistencia y seguimiento académico.
- Persistir pagos.
- Mantener integridad referencial y restricciones definidas en el modelo.

### ORM / proveedor

**Tecnología:** Entity Framework Core + Npgsql.

Su función es mapear las entidades del dominio hacia PostgreSQL y administrar el esquema mediante migraciones versionadas.

## 5. Flujo general de una solicitud

```text
Usuario
  ↓
Interfaz React
  ↓ HTTP/JSON + JWT
ASP.NET Core Controller
  ↓
Validaciones / reglas de negocio
  ↓
Entity Framework Core
  ↓
Npgsql
  ↓
PostgreSQL
  ↓
Respuesta HTTP
  ↓
React actualiza la interfaz
```

El navegador no tiene credenciales de PostgreSQL ni conexión directa con la base de datos.

## 6. Enfoque API-First

Antes de conectar una pantalla se define el contrato que el frontend debe consumir:

1. recurso;
2. verbo HTTP;
3. endpoint;
4. datos de entrada;
5. respuesta exitosa;
6. errores esperados;
7. rol autorizado.

Ejemplo: programar sesión.

| Elemento | Definición |
| --- | --- |
| Recurso | Sesión de tutoría |
| Método | POST |
| Endpoint | `/api/sesiones` |
| Rol | Administrador / PersonalAdministrativo |
| Entrada | estudiante, tutor, materia, fecha, hora inicial y hora final |
| Éxito | `201 Created` |
| Errores | 400, 401, 403, 404, 409 según la condición |

El contrato completo se documenta en `docs/api.md`.

## 7. Decisiones arquitectónicas

### React para la presentación

Se mantiene el frontend separado de la API para evitar mezclar interfaz con persistencia y lógica de negocio. React permite actualizar vistas de manera dinámica al consumir la API sin recargar completamente la página.

### ASP.NET Core Web API

Se utiliza para implementar endpoints HTTP, inyección de dependencias, autenticación JWT, autorización, validaciones y acceso a datos mediante EF Core.

### PostgreSQL

Se utiliza como base de datos relacional porque la información del sistema posee relaciones claras entre usuarios, tutores, materias, estudiantes, sesiones, asistencia, seguimiento y pagos. El proyecto no necesita una base documental para su alcance actual.

### JWT

Se utiliza autenticación stateless para que React pueda enviar el token en cada petición protegida. El backend no confía en la interfaz para determinar permisos.

### DTOs

Los endpoints utilizan objetos de transferencia de datos para controlar los campos de entrada y salida y evitar exponer directamente el modelo de persistencia.

### Git y GitHub

El código y la documentación técnica se versionan conjuntamente. Los diagramas Mermaid forman parte del repositorio para que los cambios arquitectónicos sean trazables igual que los cambios de código.

## 8. Seguridad implementada

### Contraseñas

Las contraseñas no se almacenan en texto plano. ASP.NET Core `PasswordHasher<Usuario>` produce y verifica el hash asociado al usuario.

### JWT

La validación comprueba:

- firma;
- emisor;
- audiencia;
- expiración;
- tiempo de validez sin tolerancia adicional (`ClockSkew = 0`).

### Autorización

Los roles implementados son:

- `Administrador`;
- `PersonalAdministrativo`;
- `Tutor`.

Los controladores y acciones usan autorización declarativa y validaciones adicionales cuando una regla depende de la relación entre recursos. Por ejemplo, un tutor autenticado no puede registrar asistencia en una sesión asignada a otro tutor.

### Secretos

La cadena de conexión y la clave JWT se obtienen mediante configuración y User Secrets durante el desarrollo. Los valores reales no deben subirse al repositorio.

### CORS

La política de desarrollo permite únicamente los orígenes locales definidos para el frontend (`localhost:5173` y `localhost:3000`).

## 9. Reglas de negocio representativas

### Programación

- Tutor, materia y estudiante deben existir.
- El tutor debe estar asociado a la materia.
- La hora final debe ser posterior a la inicial.
- El sistema rechaza superposición de sesiones no canceladas para el mismo tutor.

### Tutor

- Un tutor consulta sus propias sesiones mediante `/api/sesiones/mis-sesiones`.
- Solo el tutor asignado puede registrar asistencia y seguimiento.

### Asistencia

- Una sesión solo puede contener un registro de asistencia.
- Los estados válidos son `Presente` o `Ausente`.

### Seguimiento

- Está relacionado con la sesión atendida.
- Si el estudiante estuvo presente, la sesión exige seguimiento antes de completarse.

### Pagos

- Deben relacionarse con un estudiante existente.
- El monto debe ser mayor que cero.
- En esta versión se trata de control administrativo básico de pagos, no de contabilidad completa ni facturación fiscal.

## 10. Persistencia y migraciones

El esquema de PostgreSQL se mantiene mediante migraciones de Entity Framework Core. Esto permite versionar los cambios del modelo y reproducir la base de datos en otros entornos sin crear las tablas manualmente.

Flujo recomendado:

```text
Cambio de modelo
    ↓
Crear migración
    ↓
Revisar migración
    ↓
Aplicar a base de desarrollo
    ↓
Probar API
    ↓
Commit
```

## 11. OpenAPI

En ambiente `Development`, la API expone el documento OpenAPI en:

```text
http://localhost:5008/openapi/v1.json
```

OpenAPI permite verificar de manera reproducible los endpoints disponibles y sus esquemas.

## 12. Decisiones de alcance

El piloto no pretende ser un ERP completo. Quedan fuera de esta primera versión, salvo decisión posterior formalmente justificada:

- contabilidad completa;
- facturación fiscal;
- nómina de tutores;
- CRM comercial;
- Business Intelligence avanzado;
- portal independiente para padres;
- inteligencia artificial;
- aplicación móvil nativa.

Esta delimitación reduce complejidad y permite demostrar de forma confiable los procesos centrales del centro de tutorías.

## 13. Evolución prevista

Las mejoras deben incorporarse según necesidades reales del negocio y sin romper el contrato existente. Entre las posibles evoluciones se encuentran trazabilidad/auditoría, mayor control de pagos, reportes administrativos, responsables legales de estudiantes o gestión de disponibilidad. Cada ampliación deberá reflejarse en requisitos, API, modelo de datos, diagramas y documentación.

## 14. Criterio de coherencia documental

La implementación es la fuente técnica definitiva. README, C4, secuencias, contrato API y presentación deben describir lo que realmente existe en el repositorio o lo que está explícitamente identificado como arquitectura objetivo del piloto.
