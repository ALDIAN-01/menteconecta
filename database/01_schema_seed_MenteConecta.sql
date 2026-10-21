/*
 MenteConecta - Base de datos del piloto
 Motor: Microsoft SQL Server
 Alcance: autenticación, consentimiento, registro emocional, biblioteca,
 favoritos, chat con Gemini e información de apoyo.
 IMPORTANTE:
 - Ejecutar en SSMS con permisos para crear la base de datos.
 - Este script NO crea usuarios de demostración con contraseñas conocidas.
 - Las contraseñas se guardan desde el backend usando bcrypt.
*/

IF DB_ID(N'MenteConecta') IS NULL
BEGIN
    CREATE DATABASE MenteConecta;
END;
GO

USE MenteConecta;
GO

/* =========================
   1. IDENTIDAD Y CONSENTIMIENTO
   ========================= */

IF OBJECT_ID(N'dbo.Usuario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Usuario (
        idUsuario INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Usuario PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        correo NVARCHAR(254) NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_Usuario_estado DEFAULT (1),
        fechaRegistro DATETIME2(0) NOT NULL
            CONSTRAINT DF_Usuario_fechaRegistro DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Usuario_correo UNIQUE (correo),
        CONSTRAINT CK_Usuario_nombre CHECK (LEN(LTRIM(RTRIM(nombre))) >= 2)
    );
END;
GO

IF OBJECT_ID(N'dbo.PoliticaPrivacidad', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PoliticaPrivacidad (
        idPolitica INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_PoliticaPrivacidad PRIMARY KEY,
        version NVARCHAR(30) NOT NULL,
        contenido NVARCHAR(MAX) NOT NULL,
        vigenteDesde DATETIME2(0) NOT NULL
            CONSTRAINT DF_Politica_vigenteDesde DEFAULT (SYSUTCDATETIME()),
        vigenteHasta DATETIME2(0) NULL,
        CONSTRAINT UQ_PoliticaPrivacidad_version UNIQUE (version),
        CONSTRAINT CK_Politica_vigencia CHECK (
            vigenteHasta IS NULL OR vigenteHasta > vigenteDesde
        )
    );
END;
GO

IF OBJECT_ID(N'dbo.ConsentimientoDatos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConsentimientoDatos (
        idConsentimiento INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_ConsentimientoDatos PRIMARY KEY,
        idUsuario INT NOT NULL,
        idPolitica INT NOT NULL,
        finalidad NVARCHAR(30) NOT NULL,
        aceptado BIT NOT NULL,
        fechaAceptacion DATETIME2(0) NOT NULL
            CONSTRAINT DF_Consentimiento_fecha DEFAULT (SYSUTCDATETIME()),
        revocadoEn DATETIME2(0) NULL,
        CONSTRAINT FK_Consentimiento_Usuario FOREIGN KEY (idUsuario)
            REFERENCES dbo.Usuario(idUsuario),
        CONSTRAINT FK_Consentimiento_Politica FOREIGN KEY (idPolitica)
            REFERENCES dbo.PoliticaPrivacidad(idPolitica),
        CONSTRAINT CK_Consentimiento_finalidad CHECK (
            finalidad IN (N'REGISTRO_EMOCIONAL', N'CONVERSACION_IA')
        ),
        CONSTRAINT CK_Consentimiento_revocacion CHECK (
            revocadoEn IS NULL OR revocadoEn >= fechaAceptacion
        ),
        CONSTRAINT UQ_Consentimiento_IdUsuario UNIQUE (idConsentimiento, idUsuario)
    );
END;
GO

/* =========================
   2. REGISTRO EMOCIONAL
   ========================= */

IF OBJECT_ID(N'dbo.Emocion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Emocion (
        idEmocion INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Emocion PRIMARY KEY,
        nombre NVARCHAR(50) NOT NULL,
        descripcion NVARCHAR(300) NULL,
        CONSTRAINT UQ_Emocion_nombre UNIQUE (nombre)
    );
END;
GO

IF OBJECT_ID(N'dbo.RegistroEmocional', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RegistroEmocional (
        idRegistro INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_RegistroEmocional PRIMARY KEY,
        idUsuario INT NOT NULL,
        idEmocion INT NOT NULL,
        idConsentimiento INT NOT NULL,
        fecha DATETIME2(0) NOT NULL
            CONSTRAINT DF_RegistroEmocional_fecha DEFAULT (SYSUTCDATETIME()),
        intensidad TINYINT NOT NULL,
        nota NVARCHAR(1000) NULL,
        CONSTRAINT FK_Registro_Usuario FOREIGN KEY (idUsuario)
            REFERENCES dbo.Usuario(idUsuario),
        CONSTRAINT FK_Registro_Emocion FOREIGN KEY (idEmocion)
            REFERENCES dbo.Emocion(idEmocion),
        /* Asegura que el consentimiento referenciado pertenezca al mismo usuario. */
        CONSTRAINT FK_Registro_ConsentimientoUsuario
            FOREIGN KEY (idConsentimiento, idUsuario)
            REFERENCES dbo.ConsentimientoDatos(idConsentimiento, idUsuario),
        CONSTRAINT CK_Registro_intensidad CHECK (intensidad BETWEEN 1 AND 5)
    );
END;
GO

/* =========================
   3. BIBLIOTECA Y FAVORITOS
   ========================= */

IF OBJECT_ID(N'dbo.CategoriaRecurso', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CategoriaRecurso (
        idCategoria INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_CategoriaRecurso PRIMARY KEY,
        nombre NVARCHAR(80) NOT NULL,
        descripcion NVARCHAR(300) NULL,
        CONSTRAINT UQ_CategoriaRecurso_nombre UNIQUE (nombre)
    );
END;
GO

IF OBJECT_ID(N'dbo.RecursoBienestar', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecursoBienestar (
        idRecurso INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_RecursoBienestar PRIMARY KEY,
        idCategoria INT NOT NULL,
        titulo NVARCHAR(150) NOT NULL,
        descripcion NVARCHAR(500) NULL,
        contenido NVARCHAR(MAX) NOT NULL,
        duracionMinutos SMALLINT NULL,
        activo BIT NOT NULL CONSTRAINT DF_Recurso_activo DEFAULT (1),
        creadoEn DATETIME2(0) NOT NULL
            CONSTRAINT DF_Recurso_creadoEn DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Recurso_Categoria FOREIGN KEY (idCategoria)
            REFERENCES dbo.CategoriaRecurso(idCategoria),
        CONSTRAINT CK_Recurso_duracion CHECK (
            duracionMinutos IS NULL OR duracionMinutos BETWEEN 1 AND 240
        )
    );
END;
GO

IF OBJECT_ID(N'dbo.Favorito', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Favorito (
        idFavorito INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Favorito PRIMARY KEY,
        idUsuario INT NOT NULL,
        idRecurso INT NOT NULL,
        fechaGuardado DATETIME2(0) NOT NULL
            CONSTRAINT DF_Favorito_fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Favorito_Usuario FOREIGN KEY (idUsuario)
            REFERENCES dbo.Usuario(idUsuario) ON DELETE CASCADE,
        CONSTRAINT FK_Favorito_Recurso FOREIGN KEY (idRecurso)
            REFERENCES dbo.RecursoBienestar(idRecurso),
        CONSTRAINT UQ_Favorito_UsuarioRecurso UNIQUE (idUsuario, idRecurso)
    );
END;
GO

/* =========================
   4. CHAT CON IA
   ========================= */

IF OBJECT_ID(N'dbo.AvisoAsistente', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AvisoAsistente (
        idAviso INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_AvisoAsistente PRIMARY KEY,
        version NVARCHAR(30) NOT NULL,
        texto NVARCHAR(500) NOT NULL,
        vigenteDesde DATETIME2(0) NOT NULL
            CONSTRAINT DF_Aviso_vigenteDesde DEFAULT (SYSUTCDATETIME()),
        vigenteHasta DATETIME2(0) NULL,
        CONSTRAINT UQ_AvisoAsistente_version UNIQUE (version)
    );
END;
GO

IF OBJECT_ID(N'dbo.ConversacionIA', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConversacionIA (
        idConversacion INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_ConversacionIA PRIMARY KEY,
        idUsuario INT NOT NULL,
        idConsentimiento INT NOT NULL,
        idAviso INT NOT NULL,
        fechaInicio DATETIME2(0) NOT NULL
            CONSTRAINT DF_Conversacion_fecha DEFAULT (SYSUTCDATETIME()),
        estado NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Conversacion_estado DEFAULT (N'ACTIVA'),
        CONSTRAINT FK_Conversacion_Usuario FOREIGN KEY (idUsuario)
            REFERENCES dbo.Usuario(idUsuario),
        CONSTRAINT FK_Conversacion_ConsentimientoUsuario
            FOREIGN KEY (idConsentimiento, idUsuario)
            REFERENCES dbo.ConsentimientoDatos(idConsentimiento, idUsuario),
        CONSTRAINT FK_Conversacion_Aviso FOREIGN KEY (idAviso)
            REFERENCES dbo.AvisoAsistente(idAviso),
        CONSTRAINT CK_Conversacion_estado CHECK (
            estado IN (N'ACTIVA', N'CERRADA')
        )
    );
END;
GO

IF OBJECT_ID(N'dbo.Mensaje', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Mensaje (
        idMensaje INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Mensaje PRIMARY KEY,
        idConversacion INT NOT NULL,
        contenido NVARCHAR(MAX) NOT NULL,
        autor NVARCHAR(10) NOT NULL,
        creadoEn DATETIME2(0) NOT NULL
            CONSTRAINT DF_Mensaje_creado DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Mensaje_Conversacion FOREIGN KEY (idConversacion)
            REFERENCES dbo.ConversacionIA(idConversacion) ON DELETE CASCADE,
        CONSTRAINT CK_Mensaje_autor CHECK (autor IN (N'USUARIO', N'IA'))
    );
END;
GO

/* =========================
   5. RECURSOS DE APOYO
   ========================= */

IF OBJECT_ID(N'dbo.RecursoAyuda', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecursoAyuda (
        idRecursoAyuda INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_RecursoAyuda PRIMARY KEY,
        nombre NVARCHAR(150) NOT NULL,
        telefono NVARCHAR(50) NULL,
        url NVARCHAR(500) NULL,
        descripcion NVARCHAR(500) NULL,
        ambitoGeografico NVARCHAR(150) NULL,
        verificadoEn DATE NULL,
        activo BIT NOT NULL CONSTRAINT DF_RecursoAyuda_activo DEFAULT (1),
        CONSTRAINT CK_RecursoAyuda_contacto CHECK (
            telefono IS NOT NULL OR url IS NOT NULL
        )
    );
END;
GO

/* =========================
   6. ÍNDICES PARA CONSULTAS FRECUENTES
   ========================= */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RegistroEmocional_UsuarioFecha'
               AND object_id = OBJECT_ID(N'dbo.RegistroEmocional'))
    CREATE INDEX IX_RegistroEmocional_UsuarioFecha
        ON dbo.RegistroEmocional(idUsuario, fecha DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RecursoBienestar_CategoriaActivo'
               AND object_id = OBJECT_ID(N'dbo.RecursoBienestar'))
    CREATE INDEX IX_RecursoBienestar_CategoriaActivo
        ON dbo.RecursoBienestar(idCategoria, activo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ConversacionIA_UsuarioFecha'
               AND object_id = OBJECT_ID(N'dbo.ConversacionIA'))
    CREATE INDEX IX_ConversacionIA_UsuarioFecha
        ON dbo.ConversacionIA(idUsuario, fechaInicio DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Mensaje_ConversacionFecha'
               AND object_id = OBJECT_ID(N'dbo.Mensaje'))
    CREATE INDEX IX_Mensaje_ConversacionFecha
        ON dbo.Mensaje(idConversacion, creadoEn);
GO

/* =========================
   7. DATOS INICIALES (SEGUROS Y REPETIBLES)
   ========================= */

IF NOT EXISTS (SELECT 1 FROM dbo.Emocion WHERE nombre = N'Calma')
    INSERT INTO dbo.Emocion(nombre, descripcion) VALUES (N'Calma', N'Sensación de tranquilidad o equilibrio.');
IF NOT EXISTS (SELECT 1 FROM dbo.Emocion WHERE nombre = N'Alegría')
    INSERT INTO dbo.Emocion(nombre, descripcion) VALUES (N'Alegría', N'Estado de ánimo agradable o positivo.');
IF NOT EXISTS (SELECT 1 FROM dbo.Emocion WHERE nombre = N'Tristeza')
    INSERT INTO dbo.Emocion(nombre, descripcion) VALUES (N'Tristeza', N'Emoción que puede aparecer ante dificultades o pérdidas.');
IF NOT EXISTS (SELECT 1 FROM dbo.Emocion WHERE nombre = N'Ansiedad')
    INSERT INTO dbo.Emocion(nombre, descripcion) VALUES (N'Ansiedad', N'Sensación de preocupación o inquietud.');
IF NOT EXISTS (SELECT 1 FROM dbo.Emocion WHERE nombre = N'Estrés')
    INSERT INTO dbo.Emocion(nombre, descripcion) VALUES (N'Estrés', N'Sensación de presión o sobrecarga.');
IF NOT EXISTS (SELECT 1 FROM dbo.Emocion WHERE nombre = N'Enojo')
    INSERT INTO dbo.Emocion(nombre, descripcion) VALUES (N'Enojo', N'Reacción emocional ante una frustración o situación difícil.');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.CategoriaRecurso WHERE nombre = N'Respiración')
    INSERT INTO dbo.CategoriaRecurso(nombre, descripcion) VALUES (N'Respiración', N'Ejercicios de respiración consciente.');
IF NOT EXISTS (SELECT 1 FROM dbo.CategoriaRecurso WHERE nombre = N'Relajación')
    INSERT INTO dbo.CategoriaRecurso(nombre, descripcion) VALUES (N'Relajación', N'Actividades para descansar y relajar el cuerpo.');
IF NOT EXISTS (SELECT 1 FROM dbo.CategoriaRecurso WHERE nombre = N'Manejo del estrés')
    INSERT INTO dbo.CategoriaRecurso(nombre, descripcion) VALUES (N'Manejo del estrés', N'Estrategias generales para afrontar momentos de presión.');
IF NOT EXISTS (SELECT 1 FROM dbo.CategoriaRecurso WHERE nombre = N'Meditación')
    INSERT INTO dbo.CategoriaRecurso(nombre, descripcion) VALUES (N'Meditación', N'Prácticas breves de atención al momento presente.');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.PoliticaPrivacidad WHERE version = N'1.0')
    INSERT INTO dbo.PoliticaPrivacidad(version, contenido)
    VALUES (N'1.0', N'BORRADOR PARA EL PILOTO: reemplazar por el texto de privacidad aprobado por la institución antes de recopilar datos reales.');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AvisoAsistente WHERE version = N'1.0')
    INSERT INTO dbo.AvisoAsistente(version, texto)
    VALUES (N'1.0', N'MenteConecta ofrece orientación general de bienestar. La IA no realiza diagnósticos ni sustituye la atención profesional.');
GO

/* Recurso inicial: se inserta solo si no existe un recurso con el mismo título. */
IF NOT EXISTS (SELECT 1 FROM dbo.RecursoBienestar WHERE titulo = N'Pausa para respirar')
BEGIN
    INSERT INTO dbo.RecursoBienestar
        (idCategoria, titulo, descripcion, contenido, duracionMinutos)
    SELECT idCategoria, N'Pausa para respirar',
        N'Una pausa breve para volver al momento presente.',
        N'Busca una postura cómoda. Respira a tu ritmo natural y dirige la atención al aire que entra y sale. Si te incomodas, detén el ejercicio y vuelve a respirar normalmente.',
        4
    FROM dbo.CategoriaRecurso WHERE nombre = N'Respiración';
END;
GO

/* No se insertan usuarios de prueba: registrarlos mediante la API para usar bcrypt. */
/* El backend debe comprobar consentimiento aceptado y vigente antes de guardar datos. */
/* Nunca confiar en idUsuario recibido del cliente: derivarlo de la identidad autenticada. */

/* Verificación opcional de instalación:
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;
*/
