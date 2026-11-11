# SMART Tutoring Center — Operación técnica y validación

## Arquitectura y cumplimiento de la guía

La solución utiliza **arquitectura web de tres capas**:
- **React/Vite:** interfaz y navegación independiente.
- **ASP.NET Core Web API:** autenticación, autorización y reglas de negocio, con módulos organizados en un único backend modular.
- **PostgreSQL + EF Core:** persistencia, índices, restricciones y migraciones.

Este diseño respeta la separación estricta frontend/backend y el consumo de APIs exigidos en la guía de la asignatura; **no requiere microservicios**. No se utilizan Web Forms ni páginas del servidor con recarga tradicional como arquitectura de interfaz.

## Funciones incorporadas

- Disponibilidad semanal configurable por tutor (días e intervalos), excepciones por fecha y bloqueo de horarios.
- Consulta de franjas libres que descuenta sesiones activas y bloqueos; no presume disponibilidad si no hay jornada configurada.
- Validación de jornadas y excepciones en la API al crear o reprogramar.
- Sesiones pendientes de cobro con búsqueda y paginación en servidor; el indicador de pendientes excluye sesiones futuras.
- Listado de agenda por tutor/fecha paginado desde API.
- Búsqueda y paginación en servidor para catálogos de estudiantes y usuarios.
- Exportación administrativa CSV autenticada por fecha.
- Limitador de solicitudes de login en memoria (30 solicitudes/minuto por IP visto por la aplicación) y OpenAPI desactivado en la configuración pública de Render.
- Pruebas nativas de búsqueda/fecha y CI de compilación, pruebas y migración real con PostgreSQL 17.

## Entorno local

Ejecute el frontend con `npm ci` y `npm run dev` en `frontend/`. Ejecute el backend con `dotnet run` en `backend/SmartTutoring.Api/` tras configurar cadena PostgreSQL y parámetros JWT mediante User Secrets.

Pruebas:
- `cd frontend && npm test && npm run build`
- `dotnet build backend/SmartTutoring.Api/SmartTutoring.Api.csproj`

GitHub Actions añade una prueba de arranque de la API sobre PostgreSQL 17 para verificar que las migraciones puedan ejecutarse desde una base vacía.

## Matriz mínima de aceptación

| Caso | Resultado esperado |
|---|---|
| Tutor sin jornada | No se afirman espacios disponibles; se solicita configurar jornada |
| Jornada registrada | Solo se muestran espacios dentro de los intervalos configurados |
| Bloqueo que coincide con una sesión | API responde conflicto y no registra el bloqueo |
| Sesión en horas no laborales | API impide agendar si el tutor tiene jornada configurada |
| Tutor con sesión superpuesta | API responde conflicto |
| Sesión futura en Pagos | No aparece como cobrable; API impide pagar |
| Sesión finalizada sin pago | Aparece en pendientes |
| Sesión ya pagada | No reaparece como pendiente |
| Estudiante con muchos registros | El listado ofrece búsqueda y navegación por páginas |
| Acceso sin JWT al reporte CSV | Se rechaza |
| Exportación CSV | Respeta las fechas solicitadas y escapa texto de manera segura |
| Usuario Tutor | No puede administrar usuarios, pagos ni jornadas |

Estas pruebas funcionales deben ejecutarse con cuentas de cada rol en un entorno de prueba antes de operar con información real; la compilación por sí sola no las reemplaza.

## Seguridad y continuidad

La API utiliza JWT y roles, contraseñas hash y CORS restringido. OpenAPI/Swagger permanece disponible en desarrollo y desactivado en la configuración pública de Render. El limitador de acceso funciona por instancia de aplicación: **no equivale a una protección distribuida contra ataques**.

### Respaldos

Antes de operar con datos reales es obligatorio configurar un respaldo externo regular de PostgreSQL, retención y un procedimiento de restauración probado. **El repositorio no automatiza aún los respaldos ni su restauración**. No debe considerarse la persistencia del plan gratuito como estrategia de recuperación.

Se recomienda comprobar periódicamente la recuperación en una base temporal separada y restringir acceso a respaldos por contener información personal.

### Despliegue

Las migraciones se ejecutan al iniciar el backend. En un entorno de múltiples instancias es preferible ejecutarlas como proceso de despliegue controlado y no simultáneamente desde todas las instancias. Antes de una migración de producción, generar respaldo y probarla en una copia.

## Decisiones de negocio pendientes

La administración del centro debe definir y aprobar antes de automatizar:
- Cobros de inasistencia del estudiante, cancelaciones tardías y excepciones.
- Jornada efectiva de cada tutor y fechas de vacaciones/ausencias.
- Autorización para ajustar o anular pagos y emisión de documentos tributarios.
- Política de conservación, exportación y eliminación de datos.

No se han inventado reglas de facturación o disponibilidad para sustituir decisiones institucionales.

## Límites técnicos todavía abiertos

- Los formularios de selección de tutores, materias y estudiantes aún utilizan en algunas pantallas catálogos completos para sus opciones. Para volúmenes mucho mayores, sustituir por búsqueda remota con debounce y paginación del lado del servidor.
- El historial individual de pagos aún se devuelve completo; conviene añadir paginación remota.
- No existe todavía auditoría persistente de operaciones administrativas ni recuperación autoservicio de contraseñas.
- La automatización prueba una base nueva, no realiza pruebas de carga, de seguridad especializadas ni restauraciones de respaldos.
- Las capturas reales de la versión desplegada y la aceptación formal de los responsables del centro deben agregarse al informe académico cuando estén disponibles.

## Pruebas añadidas para compatibilidad con PETI

- Crear sesión sin `tarifaUsdPorSesion`: conservar tarifa académica por hora (US$10/h).
- Crear sesión con `tarifaUsdPorSesion = 20`, `25` y `30`: al registrar el pago, usar el precio fijo de la sesión multiplicado por la tasa configurada en el proyecto; no prorratear por duración.
- Verificar base de datos migrada y columna decimal `TarifaUsdPorSesion`; la falta de valor conserva compatibilidad.
- Sesión finalizada por horario pero no completada: no debe aparecer como pendiente ni aceptar cobro.
- Sesión completada con asistencia `Ausente`: no cobrar automáticamente.
- Sesión completada con asistencia `Presente`: permitir cobro administrativo único.
- Crear liquidación de tutor para sesión completada/presente, con importe acordado: estado `Pendiente`.
- La cuenta administrativa sin rol Administrador **no** puede aprobar ni marcar pagada.
- Administrador aprueba: `Aprobada`, con fecha.
- Administrador marca pagada con fecha válida: `Pagada`, sin transferencia electrónica.
- Doble liquidación de la misma sesión: conflicto; monto cero o negativo: solicitud inválida.
- Intento de pagar sin aprobación, registrar pago posterior a hoy o anterior a la aprobación: rechazo.
- Confirmar que los controles originales de horarios, usuarios y pagos siguen funcionando (regresión).

La ejecución, las capturas y los resultados observados son **pendientes de verificación**, no se consideran aprobados por el hecho de estar descritos aquí. La prueba de restauración de PostgreSQL sigue siendo necesaria para cualquier puesta en producción.
