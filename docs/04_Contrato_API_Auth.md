# Contrato inicial de API — MenteConecta piloto

Este contrato define el primer módulo de autenticación. La implementación debe respetarlo o proponer un cambio antes de alterar nombres/rutas.

## Base
- Prefijo: `/api`
- JSON UTF-8
- JWT en `Authorization: Bearer <token>` para rutas protegidas
- La API nunca devuelve `passwordHash`, contraseñas ni secretos.
- El identificador del usuario en rutas protegidas se obtiene del JWT, nunca de `req.body`.

## Endpoints del módulo 1

### `POST /api/auth/register`
Body:
```json
{
  "nombre": "Nombre Apellido",
  "correo": "persona@ejemplo.com",
  "password": "UnaClaveSegura123!"
}
```
Éxito `201`:
```json
{
  "message": "Cuenta creada correctamente",
  "user": {
    "idUsuario": 1,
    "nombre": "Nombre Apellido",
    "correo": "persona@ejemplo.com"
  },
  "token": "<jwt>"
}
```
Errores previstos: `400` datos inválidos, `409` correo registrado, `500` error interno genérico.

Reglas:
- Recortar nombre y correo; normalizar correo a minúsculas.
- Validar nombre no vacío y longitud razonable (por ejemplo 2–100).
- Validar formato básico del correo y longitud máxima 254.
- Contraseña mínima de 12 caracteres para este piloto; no devolverla en mensajes/logs.
- Hashear con bcrypt (cost factor 10–12).
- Insertar con consulta parametrizada; la restricción UNIQUE de SQL Server resuelve carreras concurrentes. Traducir el error de duplicado a `409`.
- No aceptar `idUsuario`, `estado`, `passwordHash` ni campos extra como autoridad desde el cliente.

### `POST /api/auth/login`
Body:
```json
{
  "correo": "persona@ejemplo.com",
  "password": "UnaClaveSegura123!"
}
```
Éxito `200`:
```json
{
  "message": "Inicio de sesión correcto",
  "user": {
    "idUsuario": 1,
    "nombre": "Nombre Apellido",
    "correo": "persona@ejemplo.com"
  },
  "token": "<jwt>"
}
```
Errores previstos: `400` datos inválidos, `401` credenciales incorrectas, `403` cuenta deshabilitada, `500` error interno genérico.

Reglas:
- Usar el mismo mensaje genérico para correo inexistente y contraseña incorrecta.
- Comparar con `bcrypt.compare`.
- No revelar si un correo existe.
- Firmar JWT con `JWT_SECRET` desde variables de entorno y expiración limitada (por ejemplo `2h`).
- No registrar el token ni la contraseña en logs.

### `GET /api/auth/me`
Header: `Authorization: Bearer <token>`

Éxito `200`:
```json
{
  "user": {
    "idUsuario": 1,
    "nombre": "Nombre Apellido",
    "correo": "persona@ejemplo.com"
  }
}
```
Errores previstos: `401` token ausente, inválido o vencido; `500` error interno genérico.

Reglas:
- Middleware JWT valida firma y expiración.
- Consultar el usuario activo en SQL Server para devolver los datos actuales.
- No aceptar ID de usuario en query/body para identificar al usuario.

## Códigos de estado
- `201`: cuenta creada.
- `200`: inicio de sesión o perfil autenticado.
- `400`: cuerpo inválido.
- `401`: credenciales o token inválidos.
- `403`: cuenta inactiva.
- `409`: correo duplicado.
- `429`: límite de intentos si se implementa rate limiting.
- `500`: error genérico, sin stack trace en producción.

## Seguridad mínima
- Variables `.env`; subir `.env.example`, jamás `.env`.
- `.gitignore` para `.env`, `node_modules`, logs, cobertura y archivos locales.
- Consultas parametrizadas mediante `mssql`.
- CORS limitado a origen frontend de desarrollo documentado.
- `helmet` y rate limit básico para autenticación si no complica la instalación.
- Errores controlados; stack trace solo en desarrollo.
- No guardar JWT en `localStorage` por defecto sin discutir el riesgo. Para el prototipo SPA, si se usa almacenamiento en memoria, documentar que al recargar puede perder sesión; si el equipo elige otra estrategia, documentar riesgos XSS/CSRF y configuración.
- Nunca colocar la clave de Gemini en el frontend.
- No implementar consentimiento, chat ni registros emocionales en este módulo, pero dejarlo documentado como siguiente módulo.

## Criterios de aceptación
1. Registro crea un usuario en `dbo.Usuario` y almacena un hash bcrypt, no la contraseña original.
2. Dos registros con correo equivalente en mayúsculas/minúsculas no crean duplicados.
3. Login correcto entrega JWT; contraseña incorrecta devuelve `401`.
4. `/api/auth/me` rechaza tokens ausentes, alterados o vencidos.
5. El código no expone `passwordHash`.
6. La app se puede instalar siguiendo el README desde un clon limpio.
7. Hay pruebas manuales o automatizadas para los casos anteriores y una colección Postman/archivo de ejemplos.
