# MenteConecta — documentación técnica del piloto

## Archivos
- `01_schema_seed_MenteConecta.sql`: creación de tablas e inserción idempotente de catálogos iniciales.
- `02_MER_Piloto.drawio`: modelo entidad-relación reducido.
- `03_Diagrama_Clases_Piloto.drawio`: entidades, servicios, controladores y middleware.

## Alcance incluido
- Usuario y autenticación (hash bcrypt lo genera el backend).
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
7. La política incluida en SQL es un borrador técnico; reemplazarlo por el texto institucional aprobado antes de recoger datos reales.

## Instalación local
1. Abrir `01_schema_seed_MenteConecta.sql` en SSMS.
2. Ejecutar con una cuenta que pueda crear la base de datos.
3. Confirmar que se creó `MenteConecta` y sus tablas.
4. Registrar usuarios desde la futura API para que `passwordHash` se genere con bcrypt.

## Reglas que debe aplicar la API
- Normalizar el correo antes de registrar/iniciar sesión.
- Validar los datos en el servidor.
- Derivar `idUsuario` del JWT validado, nunca confiar en un ID enviado por el cliente.
- Antes de guardar registro emocional o iniciar una conversación, validar consentimiento aceptado, vigente, del mismo usuario y para la finalidad correspondiente.
- No enviar notas emocionales ni datos personales a Gemini salvo que sea imprescindible y exista consentimiento apropiado.
- Manejar timeouts, límites de uso y errores de Gemini.
- No afirmar que el asistente diagnostica o detecta todas las crisis.
