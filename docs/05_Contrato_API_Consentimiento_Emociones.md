# Contrato API — consentimiento y registro emocional

Prefijo: `/api`. Todas las rutas de este módulo requieren `Authorization: Bearer <jwt>` y obtienen
`idUsuario` exclusivamente de la identidad autenticada. Los JSON no aceptan identificadores de
propietario ni campos adicionales. Los errores usan `{ "message": "...", "errors": {} }` cuando aplica.

## Consentimiento para registros emocionales

El único propósito soportado aquí es `REGISTRO_EMOCIONAL`; no otorga permiso para conversación con IA
ni otras finalidades.

### `GET /api/consent/status`

Consulta la política que está vigente según hora UTC y si el usuario autenticado la aceptó para la
finalidad indicada.

Éxito `200`:

```json
{
  "consentimiento": {
    "finalidad": "REGISTRO_EMOCIONAL",
    "aceptado": false,
    "valido": false,
    "fechaAceptacion": null,
    "revocadoEn": null,
    "version": "1.0"
  },
  "politica": {
    "version": "1.0",
    "contenido": "Texto de la política vigente...",
    "esBorrador": false
  }
}
```

Errores: `401` sesión ausente/inválida; `503` no hay política vigente.

### `POST /api/consent/accept`

Guarda la decisión explícita en `dbo.ConsentimientoDatos`, vinculada al usuario autenticado, la política
vigente y `REGISTRO_EMOCIONAL`. No acepta decisiones negativas ni guarda una aceptación si falta el
campo booleano explícito.

Entrada:

```json
{ "aceptado": true }
```

Éxito `201` en la primera aceptación o `200` si ya estaba vigente:

```json
{
  "message": "Consentimiento registrado.",
  "consentimiento": {
    "finalidad": "REGISTRO_EMOCIONAL",
    "aceptado": true,
    "valido": true,
    "fechaAceptacion": "2026-10-22T20:30:00.000Z",
    "revocadoEn": null,
    "version": "1.0"
  },
  "politica": {
    "version": "1.0",
    "contenido": "Texto de la política vigente...",
    "esBorrador": false
  }
}
```

Errores: `400` cuerpo inválido o confirmación ausente; `401` sesión ausente/inválida; `503` política
no disponible o no se pudo completar la aceptación.

## Registros emocionales

Emociones permitidas: `Calma`, `Alegría`, `Tristeza`, `Ansiedad`. Intensidad: entero `1`–`5`.
La fecha se genera en SQL Server con `SYSUTCDATETIME()` y se devuelve en formato ISO-8601. La nota
es opcional y admite hasta 1000 caracteres.

### `POST /api/emotions`

Requiere que el usuario tenga consentimiento aceptado, vigente y correspondiente a la política actual.
El registro y el consentimiento deben pertenecer al usuario autenticado.

Entrada:

```json
{
  "emocion": "Calma",
  "intensidad": 3,
  "nota": "Me tomé un momento para respirar."
}
```

`nota` puede omitirse o ser `""`; se almacena como `null`.

Éxito `201`:

```json
{
  "registro": {
    "idRegistro": 17,
    "emocion": "Calma",
    "intensidad": 3,
    "nota": "Me tomé un momento para respirar.",
    "fecha": "2026-10-22T20:30:00.000Z"
  }
}
```

Errores: `400` datos inválidos/campos adicionales; `401` sesión ausente/inválida; `403` sin
consentimiento vigente; `500` error interno genérico.

### `GET /api/emotions`

Devuelve exclusivamente los registros del usuario autenticado, del más reciente al más antiguo.
Es necesario estar autenticado; se permite revisar o eliminar los propios datos aunque una política
posterior requiera una nueva aceptación.

Éxito `200`:

```json
{
  "registros": [
    {
      "idRegistro": 17,
      "emocion": "Calma",
      "intensidad": 3,
      "nota": null,
      "fecha": "2026-10-22T20:30:00.000Z"
    }
  ]
}
```

Errores: `401` sesión ausente/inválida; `500` error interno genérico.

### `DELETE /api/emotions/{idRegistro}`

Elimina solo cuando el identificador pertenece al usuario autenticado. Un ID ajeno y uno inexistente
responden igual para no revelar registros de terceros.

Éxito: `204 No Content`.

Errores: `400` identificador no válido; `401` sesión ausente/inválida; `404` registro no encontrado
para el usuario; `500` error interno genérico.

## Privacidad y estado del texto

La política `1.0` describe los datos que usa el módulo, su finalidad, el consentimiento explícito,
la consulta y eliminación de registros, y las limitaciones actualmente implementadas. El campo
`esBorrador` se calcula buscando el prefijo `BORRADOR` en el contenido y es `false` para el texto
incluido. Esto no representa aprobación institucional ni una certificación de cumplimiento legal:
antes de un despliegue institucional, la entidad responsable debe completar sus datos de contacto
y revisar el aviso. La interfaz aún no ofrece revocación automática; el historial y la eliminación
individual permanecen disponibles al usuario autenticado.
