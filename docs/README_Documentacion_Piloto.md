# MenteConecta — documentación técnica del piloto

## Archivos
- `01_schema_seed_MenteConecta.sql`: creación de tablas e inserción idempotente de catálogos iniciales.
- `02_MER_Piloto.drawio`: modelo entidad-relación reducido.
- `03_Diagrama_Clases_Piloto.drawio`: entidades, servicios, controladores y middleware.
- `04_Contrato_API_Auth.md`: contrato de autenticación (Módulo 1).
- `05_Contrato_API_Consentimiento_Emociones.md`: contrato del Módulo 2.
- `../postman/MenteConecta-Consentimiento-Emociones.postman_collection.json`: flujo reproducible con SQL Server.

## Alcance incluido
- Usuario y autenticación (hash bcrypt lo genera el backend).
- Consentimiento vigente y específico para `REGISTRO_EMOCIONAL`.
- Registro, consulta y eliminación por propietario de emociones (Calma, Alegría, Tristeza y Ansiedad).
- Política de privacidad y consentimientos por finalidad.
- Registro emocional con intensidad 1–5.
- Biblioteca por categorías y favoritos.
- Conversaciones y mensajes para integrar Gemini desde el backend.
- Aviso de limitaciones de la IA y recursos de ayuda.

## Fuera del piloto
TOTP/2FA, recuperación por correo, roles de administrador, perfil editable, recordatorios, exportaciones, calificaciones, analíticas y gráficas.

## Decisiones importantes
1. Los nombres de usuario/correo no se duplican en una tabla Perfil.
2. El registro emocional referencia `Emocion` mediante `idEmocion`.
3. El registro y la conversación guardan una referencia al consentimiento y usuario; el backend debe validar además que el consentimiento esté aceptado, vigente y sea de la finalidad correcta.
4. Los mensajes se guardan asociados a una conversación. El backend debe validar que esa conversación pertenece al usuario autenticado.
5. La clave de Gemini nunca va en el frontend.
6. No se incluyen usuarios de prueba con contraseñas en texto plano.
7. La política incluida en SQL describe el funcionamiento actual del módulo; la entidad responsable debe completar sus datos de contacto y revisarla antes de un despliegue institucional.

## Instalación local
1. Abrir `01_schema_seed_MenteConecta.sql` en SSMS.
2. Ejecutar con una cuenta que pueda crear la base de datos.
3. Confirmar que se creó `MenteConecta` y sus tablas.
4. Registrar usuarios desde la API para que `passwordHash` se genere con bcrypt.
5. El Módulo 2 usa el esquema existente y no requiere una migración adicional. La política `1.0`
   sembrada describe el tratamiento de datos implementado; no representa por sí sola aprobación
   institucional ni certificación de cumplimiento legal.

## Reglas que debe aplicar la API
- Normalizar el correo antes de registrar/iniciar sesión.
- Validar los datos en el servidor.
- Derivar `idUsuario` del JWT validado, nunca confiar en un ID enviado por el cliente.
- Antes de guardar un registro emocional, validar consentimiento aceptado y vigente para la política actual, el mismo usuario y `REGISTRO_EMOCIONAL`.
- El historial y la eliminación filtran por el usuario autenticado; no aceptan propietario desde el cliente.
- No enviar notas emocionales ni datos personales a Gemini salvo que sea imprescindible y exista consentimiento apropiado.
- Manejar timeouts, límites de uso y errores de Gemini.
- No afirmar que el asistente diagnostica o detecta todas las crisis.
- No se implementa aquí revocación de consentimiento; revisión/eliminación de los propios registros sigue disponible aunque cambie la política.
