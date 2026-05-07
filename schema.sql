CREATE DATABASE IF NOT EXISTS vacation_db;
USE vacation_db;

DROP TABLE IF EXISTS solicitudes_vacaciones;
DROP TABLE IF EXISTS empleados;
DROP TABLE IF EXISTS feriados;

CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(12) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    cumple_10_anos_base TINYINT(1) DEFAULT 0,
    dias_progresivos_base INT DEFAULT 0,
    anos_externos INT DEFAULT 0,
    meses_externos INT DEFAULT 0,
    fecha_certificado DATE NULL,
    total_meses_cotizados INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feriados (
    fecha DATE PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE solicitudes_vacaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_habiles_consumidos INT NOT NULL,
    es_progresivo BOOLEAN DEFAULT FALSE,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ruta_comprobante VARCHAR(255) NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT
);

-- Índice para acelerar la búsqueda de historial de solicitudes y cálculo de saldos
ALTER TABLE solicitudes_vacaciones ADD INDEX idx_empleado (empleado_id);

-- Índice para búsquedas rápidas o validaciones por RUT en empleados
ALTER TABLE empleados ADD INDEX idx_rut (rut);
