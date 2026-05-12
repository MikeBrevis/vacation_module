CREATE DATABASE IF NOT EXISTS vacation_db;
USE vacation_db;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(255) UNIQUE NOT NULL,
    password_hash CHAR(60) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL
);

-- Insert sandra user
INSERT INTO usuarios (usuario, password_hash)
VALUES ('sandra', '$2b$10$AhgHxiX5A9OWyjJTfPxMJOC2udaWX8ED8atYuj6oOfM/miTRSLc6S');


CREATE TABLE IF NOT EXISTS empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(12) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    sucursal VARCHAR(50) NULL,
    fecha_ingreso DATE NOT NULL,
    cumple_10_anos_base TINYINT(1) DEFAULT 0,
    anos_externos INT DEFAULT 0,
    meses_externos INT DEFAULT 0,
    fecha_certificado DATE NULL,
    total_meses_cotizados INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feriados (
    fecha DATE PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS solicitudes_vacaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_habiles_consumidos FLOAT NOT NULL,
    es_progresivo BOOLEAN DEFAULT FALSE,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ruta_comprobante VARCHAR(255) NULL,
    periodo_asignado INT NULL,
    saldo_base_previo FLOAT NULL,
    saldo_progresivo_previo FLOAT NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT
);

-- Índice para acelerar la búsqueda de historial de solicitudes y cálculo de saldos
ALTER TABLE solicitudes_vacaciones ADD INDEX idx_empleado (empleado_id);

-- Índice para búsquedas rápidas o validaciones por RUT en empleados
ALTER TABLE empleados ADD INDEX idx_rut (rut);
