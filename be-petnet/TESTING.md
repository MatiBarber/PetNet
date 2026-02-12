# Guía de Testing - be-petnet

Este documento resume la configuración de pruebas y el detalle de los tests implementados, indicando qué verifica cada uno y cómo se relaciona con los criterios de aceptación.

## Entorno de pruebas

- Framework: Jest (unitarias e integración, backend solamente)
- ORM/DB: Prisma + SQLite
- Estrategia de DB temporal:
  - Antes de cada corrida de tests, se crea una base SQLite temporal en el directorio temporal del sistema.
  - Se ejecuta `prisma generate` y `prisma migrate deploy` sobre esa base para aplicar el schema.
  - Al finalizar la corrida, el archivo de base de datos se elimina automáticamente.
- Archivos clave:
  - `jest.config.js`: declara `globalSetup`, `setupFiles` y `globalTeardown`.
  - `test/jest.globalSetup.js`: crea la DB temporal y aplica migraciones.
  - `test/jest.env.js`: expone `DATABASE_URL` a los workers de Jest.
  - `test/jest.globalTeardown.js`: elimina la DB temporal.

## Cómo ejecutar

```powershell
npm test
# o en modo watch
npm run test:watch
```

## Tests implementados

### 1) test/prisma.smoke.test.js
- Tipo: Integración (Prisma + DB)
- Objetivo: Smoke test de la base de datos y el cliente Prisma.
- Flujo:
  1. Crea un registro en la tabla `usuario` con datos válidos.
  2. Verifica que el `id` generado sea > 0.
  3. Busca el usuario por `id` y verifica que el email coincide.
- Verifica:
  - Migraciones aplicadas correctamente.
  - Conexión y operaciones básicas de Prisma sobre DB temporal.

### 2) test/users.register.int.test.js
- Tipo: Integración (HTTP + Express + Prisma)
- Endpoint: `POST /users`
- Criterios de aceptación cubiertos (Historia: Registro de usuarios):
  - Validación de campos obligatorios (Nombre, Apellido, Email, Contraseña, Teléfono, Provincia, Localidad).
  - Validación de formato (email válido, password con mínimo 8 y alfanumérica; teléfono numérico y longitud mínima, etc.).
  - Registro exitoso devuelve `201`, mensaje de éxito y token (autenticación automática del backend).
  - Rechazo de email duplicado (400/409).
- Casos:
  - Faltan campos obligatorios → 400 + lista de errores.
  - Email inválido y password corta → 400 + errores de validación.
  - Registro exitoso → 201 + `token` (string) + mensaje de éxito.
  - Email duplicado → 400/409.
- Notas:
  - La redirección a animales en adopción es responsabilidad de frontend; desde backend se valida el éxito vía status, token y mensaje.

### 3) test/users.register.validations.unit.test.js
- Tipo: Unitario (validaciones de `registerValidations` con `express-validator`)
- Objetivo: Validar la lógica de validación de payload sin levantar servidor.
- Casos:
  - Faltan todos los campos → errores para todos los campos requeridos.
  - Email inválido y password corta → errores específicos asociados a cada campo.
  - Nombre/apellido con caracteres inválidos (regex) → errores en ambos campos.
  - Teléfono no numérico / demasiado corto → errores de formato/longitud.
  - Provincia/localidad no string → errores de tipo/contenido.
  - Payload válido → sin errores.
- Verifica:
  - Reglas completas de `registerValidations` se comportan como se espera.

## Cobertura de criterios de aceptación

- Acceso a pantalla de registro desde login: Cubre frontend (no automatizado aquí). Manual según alcance acordado.
- Campos obligatorios y validaciones: Cubierto por tests unitarios y de integración.
- Registro exitoso autentica y redirige:
  - Autenticación: backend devuelve token en registro exitoso (test integración lo verifica).
  - Redirección: la gestiona frontend; aquí se comprueba el status 201 + mensaje de éxito.
- Mensaje “Registro exitoso”: Test integración permite variantes habituales y verifica mensaje de éxito.

## Buenas prácticas adoptadas
- DB aislada por corrida de tests; no ensucia `dev.db`.
- `migrate deploy` garantiza schema sincronizado antes de probar.
- `prisma.$disconnect()` al finalizar pruebas que usan Prisma.

## Próximos pasos sugeridos
- Añadir reporte de cobertura (`--coverage`) para identificar rutas/controladores sin tests.
- Tests de integración adicionales para login y endpoints de usuarios/pets.
- Casos borde: trimming de strings, normalización de email, longitud máxima de campos.
