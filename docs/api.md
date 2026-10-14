# Contrato REST — SMART Tutoring Center

Este documento resume el contrato HTTP actualmente implementado por `SmartTutoring.Api`. La API utiliza JSON y autenticación JWT Bearer para las rutas protegidas.

## Base URL de desarrollo

```text
http://localhost:5008
```

OpenAPI:

```text
http://localhost:5008/openapi/v1.json
```

## Autenticación

### Iniciar sesión

`POST /api/auth/login`

Acceso: público.

Ejemplo de solicitud:

```json
{
  "correoElectronico": "usuario@ejemplo.com",
  "password": "********"
}
```

Respuesta exitosa `200 OK`:

```json
{
  "token": "<JWT>",
  "expiraEn": "<fecha-hora>",
  "correoElectronico": "usuario@ejemplo.com",
  "rol": "Administrador"
}
```

Las rutas protegidas requieren:

```http
Authorization: Bearer <token>
```

## Matriz de endpoints

### Usuarios

Base: `/api/usuarios`

Acceso: `Administrador`.

| Método | Endpoint | Operación | Éxito principal |
| --- | --- | --- | --- |
| GET | `/api/usuarios` | Listar usuarios | 200 |
| GET | `/api/usuarios/{id}` | Consultar usuario | 200 |
| POST | `/api/usuarios` | Crear Administrador o PersonalAdministrativo | 201 |
| PUT | `/api/usuarios/{id}` | Actualizar correo/rol | 204 |
| PATCH | `/api/usuarios/{id}/desactivar` | Desactivar usuario | 204 |

Reglas destacadas:

- El administrador autenticado no puede desactivar su propio usuario.
- Un usuario vinculado a un tutor debe conservar el rol `Tutor`.
- Los usuarios con rol `Tutor` se crean desde el módulo de tutores.
- Los correos electrónicos deben ser únicos.

### Estudiantes

Base: `/api/estudiantes`

Acceso administrativo: `Administrador`, `PersonalAdministrativo`.

| Método | Endpoint | Operación | Éxito principal |
| --- | --- | --- | --- |
| GET | `/api/estudiantes` | Listar estudiantes | 200 |
| GET | `/api/estudiantes/{id}` | Consultar estudiante | 200 |
| POST | `/api/estudiantes` | Registrar estudiante | 201 |
| PUT | `/api/estudiantes/{id}` | Actualizar estudiante | 204 |

Ejemplo de alta:

```json
{
  "nombre": "Ana Maria",
  "apellido": "Lopez",
  "fechaNacimiento": "2005-04-15",
  "carnet": "ST-0001",
  "telefono": "88889999"
}
```

Regla destacada: el carnet debe ser único.

### Historial académico

| Método | Endpoint | Acceso | Éxito principal |
| --- | --- | --- | --- |
| GET | `/api/estudiantes/{idEstudiante}/historial-academico` | Administrador, PersonalAdministrativo, Tutor | 200 |

El tutor solo puede consultar información de estudiantes vinculados con sus propias sesiones. El resultado integra sesiones, materia, tutor, estado de sesión, asistencia y seguimiento académico.

### Tutores

Base: `/api/tutores`

Acceso: `Administrador`, `PersonalAdministrativo`.

| Método | Endpoint | Operación | Éxito principal |
| --- | --- | --- | --- |
| GET | `/api/tutores` | Listar tutores | 200 |
| GET | `/api/tutores/{id}` | Consultar tutor | 200 |
| POST | `/api/tutores` | Registrar tutor y su usuario | 201 |
| PUT | `/api/tutores/{id}` | Actualizar datos del tutor | 204 |
| POST | `/api/tutores/{idTutor}/materias/{idMateria}` | Asignar materia al tutor | 204 |

El alta de tutor crea también un usuario autenticable con rol `Tutor`. La contraseña se almacena mediante hash, nunca en texto plano.

### Materias

Base: `/api/materias`

Acceso: `Administrador`, `PersonalAdministrativo`.

| Método | Endpoint | Operación | Éxito principal |
| --- | --- | --- | --- |
| GET | `/api/materias` | Listar materias | 200 |
| GET | `/api/materias/{id}` | Consultar materia | 200 |
| POST | `/api/materias` | Registrar materia | 201 |
| PUT | `/api/materias/{id}` | Actualizar materia | 204 |

Ejemplo:

```json
{
  "nombreMateria": "Matematicas",
  "descripcion": "Reforzamiento de matematicas",
  "nivel": "Secundaria"
}
```

### Sesiones de tutoría

Base: `/api/sesiones`

| Método | Endpoint | Acceso | Operación | Éxito principal |
| --- | --- | --- | --- | --- |
| GET | `/api/sesiones` | Administrador, PersonalAdministrativo | Listar todas las sesiones | 200 |
| GET | `/api/sesiones/mis-sesiones` | Tutor | Listar sesiones del tutor autenticado | 200 |
| GET | `/api/sesiones/{id}` | Administrador, PersonalAdministrativo o tutor asignado | Consultar detalle | 200 |
| POST | `/api/sesiones` | Administrador, PersonalAdministrativo | Programar sesión | 201 |
| PUT | `/api/sesiones/{id}` | Administrador, PersonalAdministrativo | Reprogramar | 204 |
| PATCH | `/api/sesiones/{id}/cancelar` | Administrador, PersonalAdministrativo | Cancelar | 204 |

Ejemplo de programación:

```json
{
  "idEstudiante": 1,
  "idTutor": 1,
  "idMateria": 1,
  "fecha": "2026-10-16",
  "horaInicio": "15:00:00",
  "horaFin": "16:00:00"
}
```

Validaciones principales:

- La hora de finalización debe ser posterior a la hora de inicio.
- Estudiante, tutor y materia deben existir.
- El tutor debe estar asociado a la materia seleccionada.
- Una sesión no cancelada del mismo tutor no puede superponerse con otra.
- Solo una sesión `Programada` puede reprogramarse.
- Una sesión `Completada` no puede cancelarse.

### Asistencia y seguimiento académico

Base: `/api/sesiones`

Acceso: `Tutor` asignado a la sesión.

| Método | Endpoint | Operación | Éxito principal |
| --- | --- | --- | --- |
| POST | `/api/sesiones/{idSesion}/asistencia` | Registrar asistencia | 201 |
| POST | `/api/sesiones/{idSesion}/seguimiento` | Registrar seguimiento académico | 201 |
| PATCH | `/api/sesiones/{idSesion}/completar` | Completar sesión | 204 |

Ejemplo de asistencia:

```json
{
  "estadoAsistencia": "Presente",
  "observaciones": "Asistió puntualmente"
}
```

Estados válidos: `Presente` o `Ausente`.

Ejemplo de seguimiento:

```json
{
  "temaTrabajado": "Ecuaciones lineales",
  "observaciones": "Resolvió ejercicios con apoyo mínimo"
}
```

Reglas destacadas:

- El tutor únicamente puede registrar datos en sus propias sesiones.
- Solo una sesión `Programada` admite estos registros.
- La asistencia es única por sesión.
- Si la asistencia es `Presente`, debe existir seguimiento académico antes de completar la sesión.
- La sesión no puede completarse antes de su hora de finalización.

### Pagos

Base: `/api/pagos`

Acceso: `Administrador`, `PersonalAdministrativo`.

| Método | Endpoint | Operación | Éxito principal |
| --- | --- | --- | --- |
| POST | `/api/pagos` | Registrar pago | 201 |
| GET | `/api/pagos/estudiante/{idEstudiante}` | Consultar historial de pagos del estudiante | 200 |

Ejemplo actual de registro:

```json
{
  "idEstudiante": 1,
  "monto": 750.00,
  "fechaPago": "2026-10-13",
  "concepto": "Mensualidad octubre",
  "observaciones": "Pago recibido"
}
```

Validaciones actuales:

- El estudiante debe existir.
- El monto debe ser mayor que cero.

> Nota de alcance: el piloto maneja registro administrativo básico de pagos. No constituye un sistema de facturación fiscal ni un sistema contable completo.

## Códigos HTTP utilizados

| Código | Significado dentro de la API |
| --- | --- |
| 200 OK | Consulta o autenticación exitosa. |
| 201 Created | Recurso registrado correctamente. |
| 204 No Content | Actualización/cambio de estado exitoso sin cuerpo de respuesta. |
| 400 Bad Request | Datos inválidos o validación de entrada fallida. |
| 401 Unauthorized | No autenticado o credenciales inválidas. |
| 403 Forbidden | Usuario autenticado sin permiso sobre el recurso. |
| 404 Not Found | Recurso solicitado inexistente. |
| 409 Conflict | La operación viola una regla de negocio o unicidad. |

## Convenciones

- JSON utiliza nombres de propiedades en `camelCase` al comunicarse con el frontend.
- Las fechas se envían con formato ISO `YYYY-MM-DD`.
- Las horas se envían en formato `HH:mm:ss`.
- Las operaciones protegidas deben enviar un JWT válido.
- El frontend no debe asumir permisos únicamente por ocultar botones: el backend valida los roles de manera independiente.

## Fuente de verdad

Este documento debe permanecer alineado con los controladores y DTOs de `backend/SmartTutoring.Api`. Ante cualquier cambio de contrato, se actualiza primero o simultáneamente la documentación y luego el frontend consumidor.
