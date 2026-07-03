# Zenda - Privacidad, retencion y anonimización

Fecha de version: 2026-07-03  
Version politica de privacidad: `privacy-2026-07-03`  
Version terminos: `terms-2026-07-03`

Este documento describe la implementacion minima de privacidad para la prueba piloto de Zenda, una aplicacion movil de gestion financiera personal para estudiantes universitarios. No reemplaza asesoria legal, pero deja evidencia tecnica para la HU-029 y para el short paper de tesis.

## Marco de referencia

- Ley N. 29733, Ley de Proteccion de Datos Personales: https://www.gob.pe/institucion/pcm/normas-legales/243470-29733
- Reglamento aprobado por D.S. N. 016-2024-JUS: https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus
- Autoridad Nacional de Proteccion de Datos Personales: https://www.gob.pe/8043-autoridad-nacional-de-proteccion-de-datos-personales-organizacion-de-autoridad-nacional-de-proteccion-de-datos-personales

## Datos recolectados

Zenda recolecta los siguientes datos durante el piloto:

- Identificacion de cuenta: nombre, correo, fecha de registro.
- Perfil universitario/financiero: edad, universidad, tipo de ingreso, ingreso mensual aproximado y nivel inicial de educacion financiera.
- Datos financieros ingresados por el usuario: ingresos, gastos, cuentas, presupuestos y metas.
- Interacciones educativas: quizzes, rutas de aprendizaje, encuestas pre/post, SUS, satisfaccion y feedback.
- Interacciones con IA: mensajes del chat, calificacion de respuestas, recomendaciones generadas y contexto financiero sintetizado.
- Datos tecnicos: eventos de uso, token FCM, IP/user-agent usados como evidencia del consentimiento.

## Finalidades

Los datos se usan para:

- Autenticar y proteger la cuenta.
- Registrar y mostrar informacion financiera personal.
- Generar reportes, presupuestos, metas y recomendaciones.
- Preparar contexto financiero antes de consultar el agente de Azure AI Foundry con RAG.
- Medir impacto academico en educacion financiera, conciencia de gastos, control presupuestal, usabilidad y calidad del asistente IA.
- Enviar notificaciones relacionadas con habitos financieros y recordatorios de uso.

## Consentimiento

El flujo de registro exige aceptacion explicita antes de crear la cuenta.

Implementacion:

- Frontend: la pantalla de consentimiento precede al registro.
- Backend: `POST /api/auth/register` rechaza la creacion si `consentGiven` no es `true`.
- Persistencia en `User`:
  - `consentGiven`
  - `consentAt`
  - `privacyPolicyVersion`
  - `termsVersion`
  - `consentIp`
  - `consentUserAgent`
- Auditoria: el evento `REGISTER` registra la aceptacion y versiones aceptadas, sin almacenar contrasenas ni tokens.

## Retencion

Durante el piloto, los datos activos se conservan mientras la cuenta exista y el usuario mantenga su participacion.

Retencion recomendada para el piloto:

- Datos de cuenta activa: hasta el cierre de la prueba piloto o solicitud del usuario.
- Eventos analiticos y respuestas de encuestas: hasta finalizar el analisis academico.
- Datos anonimizados: pueden conservarse para analisis estadistico del paper sin identificar directamente al titular.
- Tokens FCM y secretos de sesion: se eliminan al cerrar sesion, rotar credenciales o anonimizar la cuenta.

## Exportacion de datos

Endpoint:

`GET /api/users/me/export`

Requiere JWT. Devuelve un JSON con los datos portables del usuario:

- perfil y consentimiento,
- cuentas,
- categorias propias,
- transacciones,
- presupuestos,
- metas y contribuciones,
- recomendaciones,
- encuestas,
- progreso educativo,
- feedback,
- notificaciones,
- conversaciones IA,
- eventos de analitica.

No exporta:

- `passwordHash`,
- refresh tokens,
- codigos OTP,
- secretos internos,
- claves de servicios externos.

## Borrado logico y anonimizacion

Endpoint:

`DELETE /api/users/me`

Requiere JWT. La cuenta no se elimina fisicamente para no romper integridad historica del piloto. En su lugar:

- se marca `deletedAt`,
- se marca `dataAnonymizedAt`,
- se registra `anonymizationReason=USER_REQUEST`,
- se reemplaza el correo por un correo tecnico anonimo,
- se reemplaza el nombre por `Usuario anonimizado`,
- se invalida la contrasena,
- se incrementa `tokenVersion`,
- se eliminan refresh tokens y desafios de autenticacion,
- se elimina `fcmToken`,
- se limpian IP/user-agent de consentimiento,
- se cierran conversaciones IA activas,
- se conserva la informacion transaccional/educativa solo como dato historico no directamente identificable.

Despues de este proceso, el usuario no puede volver a autenticarse con esa cuenta porque:

- `findByEmail` filtra `deletedAt = null`,
- `JwtStrategy` rechaza usuarios con `deletedAt`,
- `tokenVersion` invalida tokens ya emitidos.

## Minimizacion en IA

El backend prepara contexto financiero sintetizado antes de consultar al agente. El objetivo es evitar enviar identificadores directos innecesarios al agente y priorizar montos agregados, categorias, presupuestos, metas y comportamiento financiero.

## Evidencia tecnica para HU-029

- Autenticacion protegida con JWT y refresh tokens.
- Hash de contrasena con bcrypt.
- Lockout por intentos fallidos.
- Revocacion de sesiones con `tokenVersion`.
- Guard que rechaza tokens expirados, usuarios eliminados o sesiones revocadas.
- Tokens moviles en `flutter_secure_storage`.
- Registro de auditoria para mutaciones relevantes.
- Consentimiento persistido con version, fecha, IP y user-agent.
- Exportacion de datos propia.
- Borrado logico con anonimizacion.

## Pendientes operativos de produccion

Estos puntos deben validarse en Azure antes de anexar evidencia final al paper:

- App Service con HTTPS Only habilitado.
- Certificado TLS vigente.
- PostgreSQL con cifrado en reposo y backups habilitados.
- Secretos gestionados como variables seguras o Key Vault.
- Acceso a base de datos restringido por red privada o reglas de firewall.
