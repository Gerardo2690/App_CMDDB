-- ============================================================
--  App CMDDB — Schema MySQL CORREGIDO v2
--  Compatible: XAMPP / MariaDB 10.x / MySQL 8.x
--  Ejecutar en phpMyAdmin o VS Code (extensión MySQL Jun Han)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ────────────────────────────────────────────────────────────
--  BASE DE DATOS
-- ────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS BD_CMDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE BD_CMDB;

-- ────────────────────────────────────────────────────────────
--  LIMPIAR TABLAS EXISTENTES (orden inverso por FKs)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS bitacora_movimientos;
DROP TABLE IF EXISTS historial_bajas;
DROP TABLE IF EXISTS bajas_pendientes;
DROP TABLE IF EXISTS mantenimientos;
DROP TABLE IF EXISTS asignaciones_rep;
DROP TABLE IF EXISTS asignaciones;
DROP TABLE IF EXISTS repuestos;
DROP TABLE IF EXISTS series;
DROP TABLE IF EXISTS activos;
DROP TABLE IF EXISTS sitios_moviles;
DROP TABLE IF EXISTS tiendas;
DROP TABLE IF EXISTS colaboradores;
DROP TABLE IF EXISTS gestores;
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS tipo_equipos;
DROP TABLE IF EXISTS catalogos;

-- ============================================================
--  1. GESTORES  (usuarios del sistema)
-- ============================================================
CREATE TABLE gestores (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  rol        VARCHAR(60)  NOT NULL DEFAULT 'Gestor',
  perfil     VARCHAR(60)  NOT NULL DEFAULT 'Administrativo',
  usuario    VARCHAR(60)  NOT NULL,
  password   VARCHAR(255) NOT NULL DEFAULT '',
  estado     VARCHAR(20)  NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gestor_email   (email),
  UNIQUE KEY uq_gestor_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  2. COLABORADORES
-- ============================================================
CREATE TABLE colaboradores (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                 VARCHAR(100) NOT NULL,
  apellido               VARCHAR(100) NOT NULL,
  dni                    VARCHAR(20),
  email                  VARCHAR(150),
  telefono               VARCHAR(20),
  modalidad_contratacion VARCHAR(60),
  area                   VARCHAR(80),
  vicepresidencia        VARCHAR(100),
  centro_costo           VARCHAR(60),
  ubicacion_fisica       VARCHAR(120),
  puesto                 VARCHAR(100),
  tipo_puesto            VARCHAR(40),
  correo_supervisor      VARCHAR(150),
  fecha_ingreso          DATE,
  estado                 VARCHAR(20) DEFAULT 'Activo',
  fecha_cese             DATE,
  -- CORRECCIÓN: soft delete (no se pierde historial de asignaciones)
  deleted_at             TIMESTAMP   NULL DEFAULT NULL,
  created_at             TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_colab_dni (dni),
  INDEX idx_colab_estado (estado),
  INDEX idx_colab_area   (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  3. TIENDAS / SEDES
-- ============================================================
CREATE TABLE tiendas (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo               VARCHAR(20)  NOT NULL,
  nombre               VARCHAR(150) NOT NULL,
  tipo_local           VARCHAR(80),
  estado               VARCHAR(20)  DEFAULT 'Activa',
  region               VARCHAR(60),
  departamento         VARCHAR(60),
  provincia            VARCHAR(60),
  distrito             VARCHAR(60),
  direccion            TEXT,
  responsable          VARCHAR(120),
  telefono_responsable VARCHAR(20),
  email_responsable    VARCHAR(150),
  telefono             VARCHAR(20),
  fecha_apertura       DATE,
  observaciones        TEXT,
  -- CORRECCIÓN: soft delete
  deleted_at           TIMESTAMP    NULL DEFAULT NULL,
  created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tienda_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  4. SITIOS MÓVILES
-- ============================================================
CREATE TABLE sitios_moviles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo      VARCHAR(30)  NOT NULL,
  sede        VARCHAR(120),
  area        VARCHAR(80),
  piso        VARCHAR(40),
  ubicacion   VARCHAR(120),
  estado      VARCHAR(20)  DEFAULT 'Activo',
  observacion TEXT,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sitio_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  5. ACTIVOS  (equipos TI)
-- ============================================================
CREATE TABLE activos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo              VARCHAR(20)  NOT NULL,
  tipo                VARCHAR(60)  NOT NULL,
  equipo              VARCHAR(80),
  marca               VARCHAR(60),
  modelo              VARCHAR(120),
  sku                 VARCHAR(80),
  procesador          VARCHAR(120),
  gama                VARCHAR(20),
  sistema_operativo   VARCHAR(40),
  origen_equipo       VARCHAR(30),
  adenda              VARCHAR(100),
  adenda_fecha_inicio DATE,
  adenda_fecha_fin    DATE,
  estado_equipo       VARCHAR(30),
  costo               DECIMAL(10,2) DEFAULT 0,
  ubicacion           VARCHAR(80),
  tipo_documento      VARCHAR(60),
  n_documento         VARCHAR(60),
  fecha_ingreso       DATE,
  fecha_compra        DATE,
  estado              VARCHAR(30)   DEFAULT 'Disponible',
  responsable         VARCHAR(120),
  observaciones       TEXT,
  -- CORRECCIÓN: ruta de archivo en lugar de base64 en BD
  guia_ruta           VARCHAR(255)  DEFAULT NULL,
  -- CORRECCIÓN: soft delete
  deleted_at          TIMESTAMP     NULL DEFAULT NULL,
  created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_activo_codigo (codigo),
  -- CORRECCIÓN: índices para los filtros del dashboard
  INDEX idx_activo_estado    (estado),
  INDEX idx_activo_tipo      (tipo),
  INDEX idx_activo_ubicacion (ubicacion),
  INDEX idx_activo_deleted   (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  6. SERIES  (N series por activo)
-- ============================================================
CREATE TABLE series (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activo_id   INT UNSIGNED NOT NULL,
  serie       VARCHAR(100) NOT NULL,
  cod_inv     VARCHAR(60),
  estado_cmdb VARCHAR(30),
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_serie (serie),
  -- CORRECCIÓN: índice en cod_inv para búsquedas por código inventario
  INDEX idx_serie_codinv    (cod_inv),
  INDEX idx_serie_activo_id (activo_id),
  CONSTRAINT fk_serie_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  7. REPUESTOS
-- ============================================================
CREATE TABLE repuestos (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo             VARCHAR(20)  NOT NULL,
  categoria          VARCHAR(30)  NOT NULL,
  tipo               VARCHAR(80)  NOT NULL,
  capacidad          VARCHAR(30),
  marca              VARCHAR(60),
  modelo             VARCHAR(120),
  serie              VARCHAR(100),
  part_number        VARCHAR(80),
  n_documento        VARCHAR(60),
  tipo_documento     VARCHAR(60),
  almacen            VARCHAR(80),
  activo_asignado_id INT UNSIGNED DEFAULT NULL,
  estado_disp        VARCHAR(30)  DEFAULT 'DISPONIBLE',
  estado_cmdb        VARCHAR(30),
  uso_equipo         VARCHAR(30),
  equipo             VARCHAR(80),
  observaciones      TEXT,
  fecha_ingreso      DATE,
  -- CORRECCIÓN: soft delete
  deleted_at         TIMESTAMP    NULL DEFAULT NULL,
  created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_repuesto_codigo (codigo),
  UNIQUE KEY uq_repuesto_serie  (serie),
  INDEX idx_rep_estado    (estado_disp),
  INDEX idx_rep_categoria (categoria),
  CONSTRAINT fk_rep_activo
    FOREIGN KEY (activo_asignado_id) REFERENCES activos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  8. ASIGNACIONES
-- ============================================================
CREATE TABLE asignaciones (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activo_id           INT UNSIGNED NOT NULL,
  -- CORRECCIÓN: sitio_id como FK real (antes era sitio_cod VARCHAR)
  sitio_id            INT UNSIGNED DEFAULT NULL,
  colaborador_id      INT UNSIGNED DEFAULT NULL,
  gestor_id           INT UNSIGNED DEFAULT NULL,
  reemplaza_asig_id   INT UNSIGNED DEFAULT NULL,
  serie_asignada      VARCHAR(100),
  -- snapshot histórico: nombre del colaborador al momento de asignar
  colaborador_nombre  VARCHAR(200),
  correo_colab        VARCHAR(150),
  area                VARCHAR(80),
  sede                VARCHAR(120),
  tipo_dest           VARCHAR(10)  DEFAULT 'colab',
  tipo_asignacion     VARCHAR(60),
  motivo              VARCHAR(120),
  ticket              VARCHAR(60),
  fecha_asignacion    DATETIME,
  fecha_retorno       DATETIME,
  fecha_fin_prestamo  DATE,
  jefe                VARCHAR(150),
  acta_entrega        VARCHAR(100),
  estado              VARCHAR(20)  DEFAULT 'Vigente',
  pendiente_retorno   TINYINT(1)   DEFAULT 0,
  is_principal        TINYINT(1)   DEFAULT 1,
  observaciones       TEXT,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  -- CORRECCIÓN: índices para los filtros más usados del frontend
  INDEX idx_asig_ticket  (ticket),
  INDEX idx_asig_estado  (estado),
  INDEX idx_asig_fecha   (fecha_asignacion),
  INDEX idx_asig_activo  (activo_id),
  INDEX idx_asig_colab   (colaborador_id),
  CONSTRAINT fk_asig_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_asig_colab
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_asig_sitio
    FOREIGN KEY (sitio_id) REFERENCES sitios_moviles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_asig_gestor
    FOREIGN KEY (gestor_id) REFERENCES gestores(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_asig_reemplaza
    FOREIGN KEY (reemplaza_asig_id) REFERENCES asignaciones(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  9. ASIGNACIONES DE REPUESTOS
-- ============================================================
CREATE TABLE asignaciones_rep (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repuesto_id      INT UNSIGNED NOT NULL,
  activo_id        INT UNSIGNED DEFAULT NULL,
  colaborador_id   INT UNSIGNED DEFAULT NULL,
  gestor_id        INT UNSIGNED DEFAULT NULL,
  ticket           VARCHAR(60),
  fecha_asignacion DATETIME,
  fecha_retorno    DATETIME,
  estado           VARCHAR(20)  DEFAULT 'Vigente',
  observaciones    TEXT,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_arep_estado (estado),
  CONSTRAINT fk_arep_repuesto
    FOREIGN KEY (repuesto_id) REFERENCES repuestos(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_arep_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_arep_colab
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  10. MANTENIMIENTOS  (tabla nueva — antes no existía)
-- ============================================================
CREATE TABLE mantenimientos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activo_id   INT UNSIGNED NOT NULL,
  gestor_id   INT UNSIGNED DEFAULT NULL,
  tipo        VARCHAR(30)  NOT NULL DEFAULT 'CORRECTIVO',
  serie       VARCHAR(100),
  ticket      VARCHAR(60),
  tecnico     VARCHAR(120),
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin    DATE,
  estado      VARCHAR(30)  DEFAULT 'En Proceso',
  costo       DECIMAL(10,2) DEFAULT 0,
  observaciones TEXT,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mant_activo (activo_id),
  INDEX idx_mant_estado (estado),
  INDEX idx_mant_ticket (ticket),
  CONSTRAINT fk_mant_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_mant_gestor
    FOREIGN KEY (gestor_id) REFERENCES gestores(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  11. BAJAS PENDIENTES
-- ============================================================
CREATE TABLE bajas_pendientes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activo_id       INT UNSIGNED NOT NULL,
  gestor_id       INT UNSIGNED DEFAULT NULL,
  motivo          VARCHAR(200),
  fecha_solicitud DATE,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_baja_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_baja_gestor
    FOREIGN KEY (gestor_id) REFERENCES gestores(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  12. HISTORIAL DE BAJAS  (snapshot — datos se guardan tal como estaban)
-- ============================================================
CREATE TABLE historial_bajas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activo_id     INT UNSIGNED DEFAULT NULL,
  -- snapshot: se guarda el estado del activo al momento de la baja
  activo_codigo VARCHAR(20),
  tipo          VARCHAR(60),
  marca         VARCHAR(60),
  modelo        VARCHAR(120),
  serie         VARCHAR(100),
  cod_inv       VARCHAR(60),
  motivo        VARCHAR(200),
  fecha_baja    DATE,
  gestor_id     INT UNSIGNED DEFAULT NULL,
  observaciones TEXT,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hbaja_activo (activo_id),
  CONSTRAINT fk_hbaja_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_hbaja_gestor
    FOREIGN KEY (gestor_id) REFERENCES gestores(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  13. MOVIMIENTOS  (log de actividad del usuario)
-- ============================================================
CREATE TABLE movimientos (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gestor_id  INT UNSIGNED DEFAULT NULL,
  tipo       VARCHAR(80)  NOT NULL,
  detalle    TEXT,
  fecha      DATE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_fecha (fecha),
  CONSTRAINT fk_mov_gestor
    FOREIGN KEY (gestor_id) REFERENCES gestores(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  14. BITÁCORA DE MOVIMIENTOS  (movimiento físico de stock)
-- ============================================================
CREATE TABLE bitacora_movimientos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- CORRECCIÓN: activo_id FK para trazabilidad completa por equipo
  activo_id         INT UNSIGNED DEFAULT NULL,
  gestor_id         INT UNSIGNED DEFAULT NULL,
  movimiento        VARCHAR(30)  NOT NULL,
  almacen           VARCHAR(80),
  tipo_equipo       VARCHAR(60),
  equipo            VARCHAR(80),
  modelo            VARCHAR(120),
  serie             VARCHAR(100),
  cod_inv           VARCHAR(60),
  motivo            TEXT,
  ticket            VARCHAR(60),
  estado_asignacion VARCHAR(30),
  fecha             DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bit_activo    (activo_id),
  INDEX idx_bit_ticket    (ticket),
  INDEX idx_bit_fecha     (fecha),
  INDEX idx_bit_serie     (serie),
  CONSTRAINT fk_bit_activo
    FOREIGN KEY (activo_id) REFERENCES activos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_bit_gestor
    FOREIGN KEY (gestor_id) REFERENCES gestores(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  15. CATÁLOGOS  (parámetros configurables — reemplaza DB.getConfig)
-- ============================================================
CREATE TABLE catalogos (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria VARCHAR(60)  NOT NULL,
  valor     VARCHAR(120) NOT NULL,
  orden     SMALLINT UNSIGNED DEFAULT 0,
  activo    TINYINT(1)   DEFAULT 1,
  UNIQUE KEY uq_cat_val (categoria, valor),
  INDEX idx_cat_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  16. TIPO EQUIPOS  (mapa tipo → subclase funcional)
-- ============================================================
CREATE TABLE tipo_equipos (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo   VARCHAR(60) NOT NULL,
  equipo VARCHAR(80) NOT NULL,
  UNIQUE KEY uq_tipo_equipo (tipo, equipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  DATOS INICIALES
-- ============================================================

-- Gestor admin por defecto
-- NOTA: password vacío = sin contraseña (como en tu localStorage actual)
-- En producción usar password_hash() de PHP para bcrypt
INSERT INTO gestores (nombre, email, rol, perfil, usuario, password, estado) VALUES
  ('Gerardo R.',     'gerardo@empresa.com',        'Administrador', 'Administrativo', 'admin',   '', 'Activo'),
  ('Admin TI',       'admin.ti@empresa.com',        'Gestor',        'Administrativo', 'gestor',  'gestor123', 'Activo'),
  ('Carlos Tiendas', 'carlos.tiendas@empresa.com',  'Gestor',        'Tiendas',        'tiendas', 'tiendas123', 'Activo');

-- Tiendas de muestra
INSERT INTO tiendas (codigo, nombre, tipo_local, region, departamento, provincia, distrito, direccion, responsable, telefono_responsable, email_responsable, telefono, estado, fecha_apertura, observaciones) VALUES
  ('TDA-00001','Tienda San Borja',    'TIENDA PROPIA',                'LIMA',  'LIMA','LIMA','SAN BORJA',    'Av. Javier Prado Este 1234','Juan Pérez',    '987654321','juan.perez@empresa.com',    '01-2345678','Activa','2022-03-15','Tienda principal zona sur'),
  ('TDA-00002','Tienda Miraflores',  'TIENDA PROPIA',                'LIMA',  'LIMA','LIMA','MIRAFLORES',   'Av. Larco 567',             'María García',  '987654322','maria.garcia@empresa.com',  '01-3456789','Activa','2021-08-20',''),
  ('TDA-00003','Tienda Plaza Norte', 'LOCAL EN CENTRO COMERCIAL',    'LIMA',  'LIMA','LIMA','INDEPENDENCIA','CC Plaza Norte Local 215',  'Carlos López',  '987654323','carlos.lopez@empresa.com',  '01-4567890','Activa','2023-01-10','Ubicada en el 2do piso'),
  ('TDA-00004','Tienda Arequipa',    'TIENDA PROPIA',                'SUR',   'AREQUIPA','AREQUIPA','CERCADO','Calle Mercaderes 312',    'Ana Martínez',  '987654324','ana.martinez@empresa.com',  '054-234567','Activa','2022-06-01',''),
  ('TDA-00005','Tienda Trujillo Mall','LOCAL EN CENTRO COMERCIAL',   'NORTE', 'LA LIBERTAD','TRUJILLO','TRUJILLO','CC Mall Aventura Local 108','Luis Rodríguez','987654325','luis.rodriguez@empresa.com','044-345678','Activa','2023-05-20',''),
  ('TDA-00006','Punto de Venta Cusco','PUNTO DE VENTA',              'SUR',   'CUSCO','CUSCO','CUSCO',       'Av. El Sol 890',            'Carmen Sánchez','987654326','carmen.sanchez@empresa.com','084-456789','Inactiva','2021-11-15','Temporalmente cerrada'),
  ('TDA-00007','Tienda Piura',       'LOCAL EN CENTRO COMERCIAL',    'NORTE', 'PIURA','PIURA','PIURA',       'CC Open Plaza Local 305',   'Pedro Díaz',    '987654327','pedro.diaz@empresa.com',    '073-567890','Activa','2023-09-01',''),
  ('TDA-00008','Almacén Central',    'ALMACÉN',                      'LIMA',  'LIMA','LIMA','LA VICTORIA',  'Jr. Gamarra 456 Int. 201',  'Laura Torres',  '987654328','laura.torres@empresa.com',  '01-5678901','Activa','2020-01-15','Almacén principal');

-- Catálogos (equivalente a todos los DB.getConfig del frontend)
INSERT INTO catalogos (categoria, valor, orden) VALUES
  -- Tipos de equipo
  ('tipos','LAPTOP',1),('tipos','DESKTOP',2),('tipos','MONITOR',3),
  ('tipos','IMPRESORA',4),('tipos','SERVIDOR',5),('tipos','SWITCH',6),
  ('tipos','ACCESS POINT',7),('tipos','TABLET',8),('tipos','TELÉFONO IP',9),
  -- Marcas
  ('marcas','DELL',1),('marcas','HP',2),('marcas','LENOVO',3),('marcas','APPLE',4),
  ('marcas','SAMSUNG',5),('marcas','CISCO',6),('marcas','ASUS',7),('marcas','ACER',8),
  ('marcas','MICROSOFT',9),
  -- Estados activo
  ('estados','Disponible',1),('estados','Asignado',2),
  ('estados','Mantenimiento',3),('estados','Dado de Baja',4),
  -- Estados equipo
  ('estadosEquipo','NUEVO',1),('estadosEquipo','USADO',2),('estadosEquipo','REPARACIÓN',3),
  ('estadosEquipo','GARANTÍA',4),('estadosEquipo','DESTRUCCIÓN',5),
  ('estadosEquipo','DONACIÓN',6),('estadosEquipo','VENTA',7),
  -- Gamas
  ('gamas','GAMA A',1),('gamas','GAMA B',2),('gamas','GAMA C',3),('gamas','GAMA D',4),
  -- Orígenes
  ('origenes','PROPIO',1),('origenes','ALQUILADO',2),('origenes','TERCERO',3),
  -- Tipos de documento
  ('tipoDocumento','PEDIDO',1),('tipoDocumento','ORDEN DE COMPRA',2),
  ('tipoDocumento','GUÍA DE REMISIÓN',3),('tipoDocumento','FACTURA',4),
  ('tipoDocumento','NOTA DE INGRESO',5),
  -- Sistemas operativos
  ('sistemasOS','WIN 10',1),('sistemasOS','WIN 11',2),('sistemasOS','WIN 7',3),
  ('sistemasOS','LINUX',4),('sistemasOS','MAC OS',5),('sistemasOS','ANDROID',6),
  ('sistemasOS','IOS',7),('sistemasOS','CHROME OS',8),('sistemasOS','SIN SO',9),
  -- Tipos repuesto
  ('tiposRepuesto','DISCO DURO',1),('tiposRepuesto','MEMORIA RAM',2),
  ('tiposRepuesto','PANTALLA',3),('tiposRepuesto','TECLADO',4),
  ('tiposRepuesto','BATERÍA',5),('tiposRepuesto','CARGADOR',6),
  ('tiposRepuesto','PLACA MADRE',7),('tiposRepuesto','PROCESADOR',8),
  ('tiposRepuesto','VENTILADOR',9),('tiposRepuesto','CABLE FLEX',10),
  ('tiposRepuesto','BISAGRA',11),('tiposRepuesto','TOUCHPAD',12),
  ('tiposRepuesto','WEBCAM',13),('tiposRepuesto','PARLANTE',14),
  ('tiposRepuesto','PUERTO USB',15),('tiposRepuesto','CONECTOR DC',16),
  -- RAM y almacenamiento
  ('opcionesRAM','2 GB',1),('opcionesRAM','4 GB',2),('opcionesRAM','8 GB',3),
  ('opcionesRAM','16 GB',4),('opcionesRAM','32 GB',5),('opcionesRAM','64 GB',6),
  ('opcionesAlmacenamiento','128 GB',1),('opcionesAlmacenamiento','256 GB',2),
  ('opcionesAlmacenamiento','500 GB',3),('opcionesAlmacenamiento','512 GB',4),
  ('opcionesAlmacenamiento','1 TB',5),('opcionesAlmacenamiento','2 TB',6),
  -- Áreas
  ('areas','TI',1),('areas','FINANZAS',2),('areas','RRHH',3),
  ('areas','OPERACIONES',4),('areas','COMERCIAL',5),('areas','LEGAL',6),
  -- Regiones y departamentos
  ('regiones','LIMA',1),('regiones','NORTE',2),('regiones','SUR',3),
  ('regiones','CENTRO',4),('regiones','ORIENTE',5),
  ('departamentos','LIMA',1),('departamentos','AREQUIPA',2),('departamentos','LA LIBERTAD',3),
  ('departamentos','CUSCO',4),('departamentos','PIURA',5),('departamentos','LAMBAYEQUE',6),
  -- Tipos de local
  ('tiposLocal','TIENDA PROPIA',1),('tiposLocal','LOCAL EN CENTRO COMERCIAL',2),
  ('tiposLocal','PUNTO DE VENTA',3),('tiposLocal','FRANQUICIA',4),
  ('tiposLocal','ALMACÉN',5),('tiposLocal','OFICINA',6),
  -- Sedes admin
  ('sedesAdmin','SEDE CENTRAL',1),('sedesAdmin','SEDE SAN ISIDRO',2),
  ('sedesAdmin','SEDE MIRAFLORES',3),('sedesAdmin','SEDE SAN BORJA',4),
  -- Tipo puesto
  ('tipoPuesto','PRESENCIAL',1),('tipoPuesto','REMOTO',2),('tipoPuesto','HÍBRIDO',3),
  -- Tipo asignación
  ('tipoAsignacion','INGRESO NUEVO',1),('tipoAsignacion','REEMPLAZO',2),
  ('tipoAsignacion','ASIGNACIÓN',3),('tipoAsignacion','PRÉSTAMO',4),
  ('tipoAsignacion','RENOVACIÓN',5),('tipoAsignacion','REPOSICIÓN DAÑO FÍSICO',6),
  ('tipoAsignacion','REPOSICIÓN ROBO',7),
  -- Tipo mantenimiento (nuevo)
  ('tipoMantenimiento','PREVENTIVO',1),('tipoMantenimiento','CORRECTIVO',2),
  ('tipoMantenimiento','GARANTÍA',3),
  -- Mapeos EPP
  ('mapeoEPAdmin','LAPTOP',1),
  ('mapeoAdicErg','MOCHILA',1),('mapeoAdicErg','ALZA NOTEBOOK',2),
  ('mapeoAdicErg','KIT TECLADO-MOUSE INALAMBRICO',3),('mapeoAdicErg','PAD MOUSE',4);

-- Tipo equipos (mapa tipo → subclase funcional)
INSERT INTO tipo_equipos (tipo, equipo) VALUES
  ('LAPTOP','LAPTOP CORPORATIVO'),('LAPTOP','LAPTOP EJECUTIVO'),
  ('LAPTOP','LAPTOP DESARROLLADOR'),('LAPTOP','LAPTOP DISEÑO'),
  ('DESKTOP','DESKTOP CORPORATIVO'),('DESKTOP','WORKSTATION'),('DESKTOP','ALL IN ONE'),
  ('MONITOR','MONITOR 24'),('MONITOR','MONITOR 27'),('MONITOR','MONITOR CURVO'),
  ('IMPRESORA','IMPRESORA LASER'),('IMPRESORA','IMPRESORA MULTIFUNCION'),
  ('IMPRESORA','IMPRESORA ETIQUETAS'),
  ('SERVIDOR','SERVIDOR TORRE'),('SERVIDOR','SERVIDOR RACK'),
  ('SWITCH','SWITCH 8P'),('SWITCH','SWITCH 24P'),('SWITCH','SWITCH 48P'),
  ('ACCESS POINT','ACCESS POINT TECHO'),('ACCESS POINT','ACCESS POINT PARED');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  FIN DEL SCRIPT
--  Tablas creadas: 16
--  Correcciones aplicadas: 7
--  Datos de muestra: gestores(3), tiendas(8), catálogos(~90), tipo_equipos(19)
-- ============================================================
