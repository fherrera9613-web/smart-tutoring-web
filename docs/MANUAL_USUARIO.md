# SMART Tutoring Center — Manual de usuario

**Alcance:** sistema web de gestión académica y administrativa.  
**Perfiles:** Administrador, Personal Administrativo y Tutor.

> Este documento describe el flujo implementado en la aplicación. Para una entrega formal con evidencias, se deben añadir capturas reales del entorno de producción después de la validación de aceptación.

## 1. Acceso

1. Abra la dirección del sistema autorizada por el centro.
2. Ingrese su correo y contraseña.
3. Seleccione **Iniciar sesión**.
4. El contenido visible depende de su rol. Para salir, use **Cerrar sesión**.

Si recibe un mensaje de credenciales inválidas, verifique los datos. Los intentos de acceso están sujetos a un límite para proteger el servicio.

## 2. Estudiantes

En **Estudiantes** puede registrar y actualizar información. El carnet debe utilizar el formato institucional `ST-0001`. La fecha de nacimiento no puede estar en el futuro. La tabla permite **buscar por nombre, carnet o teléfono** y desplazarse por páginas. Desde **Historial** consulte las tutorías y registros académicos del estudiante.

## 3. Tutores

En **Tutores**, el personal autorizado registra tutores, sus especialidades y años de experiencia. Mediante **Asignar materia** relaciona al tutor con las materias que puede impartir.

### Configurar jornada

**Tutor:** inicie sesión con su propia cuenta y seleccione **Mi disponibilidad** en el menú lateral. Pulse **Agregar intervalo** para configurar el día y las horas en que puede impartir tutorías, repitiendo la operación cuando tenga distintos tramos durante un mismo día. Finalmente, pulse **Guardar disponibilidad**.

**Administrador o Personal Administrativo:** en **Tutores → Supervisión de disponibilidad**, busque al docente correspondiente. Puede consultar su jornada y realizar correcciones cuando sea necesario utilizando el mismo editor.

Los intervalos semanales no pueden superponerse y los cambios no deben dejar sesiones futuras ya reservadas fuera de la jornada. Un tutor solamente puede editar sus propios datos de disponibilidad; la API verifica esta condición independientemente del identificador indicado en la solicitud.

**Importante:** un tutor sin jornada configurada no debe interpretarse como disponible todo el día; todavía falta registrar su jornada real.

### Registrar una excepción

Desde **Mi disponibilidad**, el tutor puede seleccionar fecha, horas y motivo opcional en **Ausencias y excepciones**. El personal administrativo también puede gestionar esos bloqueos desde la supervisión. Los bloqueos se rechazan si existe una sesión activa superpuesta; primero debe reprogramarla o cancelarla conforme a las reglas del sistema.

## 4. Sesiones

Para agendar, busque estudiante, tutor y materia, elija fecha y horas y pulse **Agendar sesión**. El tutor debe estar asignado a esa materia; la sesión debe iniciar en el futuro, durar al menos 15 minutos y no entrar en conflicto con otra sesión del tutor.

En **Consultar horario por tutor**, seleccione tutor y fecha. El panel **Espacios disponibles** muestra intervalos calculados a partir de jornadas, reservas y bloqueos. Al pulsar **Usar** se prepara el formulario de agendamiento para ese intervalo; complete estudiante y materia antes de guardar. El backend vuelve a validar la disponibilidad al registrar.

También puede reprogramar o cancelar sesiones permitidas desde la tabla. No se pueden cancelar sesiones completadas ni sesiones con pago registrado sin un proceso administrativo específico.

## 5. Mis sesiones (rol Tutor)

Ingrese a **Mis sesiones** y busque la tutoría por estudiante, materia o fecha. Abra **Ver detalle** para registrar asistencia y seguimiento académico según el momento de la sesión. No se permite completar una sesión antes de su finalización ni saltar los requisitos del registro académico.

## 6. Pagos

El panel **Sesiones pendientes de cobro** muestra tutorías cuyo horario ya terminó, no canceladas y sin pago. Busque por estudiante, carnet o materia; puede navegar por páginas y pulsar **Preparar cobro**.

Para registrar:

1. Seleccione estudiante y sesión finalizada.
2. Revise la duración expresada en minutos y el monto calculado en córdobas.
3. Seleccione método y fecha de pago, añada observaciones opcionales.
4. Pulse **Registrar pago**.
5. Desde el comprobante, utilice **Imprimir** si lo necesita.

La API calcula el monto; no es editable por el usuario. El sistema impide pagos duplicados para una misma sesión.

### Historial y reportes

Busque un estudiante en **Historial de pagos** para revisar registros y reimprimir comprobantes. En **Exportar pagos**, indique el período (hasta 366 días) y descargue el archivo CSV. La exportación solo está disponible para usuarios autorizados.

Los comprobantes son administrativos: **no sustituyen facturas fiscales**.

## 7. Usuarios (administrador)

En **Usuarios**, registre cuentas administrativas, consulte el listado paginado y gestione roles permitidos. El sistema impide desactivar la cuenta con la que se está conectado y protege las vinculaciones de cuentas de tutores.

## 8. Restricciones y ayuda

- No comparta credenciales ni exportaciones con personas no autorizadas.
- El horario libre mostrado depende de que se hayan configurado correctamente jornadas y bloqueos.
- Las políticas sobre cobro de ausencias justificadas/injustificadas requieren aprobación del centro; no deben deducirse de la interfaz.
- Si aparece un error, conserve el mensaje, módulo y fecha/hora del incidente para soporte.

## 9. Tarifas por sesión y pago a tutores (adecuación al PETI)

Al **agendar** una sesión desde **Sesiones**, puede escribir el importe total acordado en el campo `Tarifa acordada por sesión (USD)`. Este importe es opcional. Si se omite, se mantiene el cálculo por hora del piloto académico. La tarifa acordada en la creación queda asociada a esa sesión y no cambia cuando se reprograma. La pantalla de **Pagos** muestra el importe calculado en córdobas según los datos guardados.

Antes de registrar un cobro, el tutor registra asistencia `Presente`, completa el seguimiento exigido y marca la sesión como `Completada`. Las sesiones simplemente vencidas por horario o con asistencia ausente no se incluyen en la lista de cobros pendientes.

En **Pago a tutores**, el personal autorizado selecciona una sesión `Completada`, introduce el **importe acordado en córdobas** y registra la solicitud. La Dirección (Administrador) debe revisar y pulsar **Aprobar**. Una vez realizado efectivamente el pago por un medio externo, registra la fecha y pulsa **Registrar pago**. Esta acción solo deja constancia administrativa y no envía dinero.

No se calcula automáticamente cuánto corresponde al tutor porque el acuerdo de remuneración todavía debe ser validado. No se admiten registros duplicados para una misma sesión. Si el administrador no puede confirmar el pago, debe mantener la liquidación `Aprobada`.

**Para la defensa:** usar exclusivamente datos ficticios y capturas auténticas del sistema. No utilizar credenciales personales, ni presentar la base gratuita de Render como respaldo permanente.
