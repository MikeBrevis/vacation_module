# 01. Plan de Implementación: Base de Datos (Fase 2)

## Dependencias Previas
- Ninguna. Esta es la fase inicial del proyecto.

## Diagrama de Relaciones

```text
+-----------------------+       +------------------------------+
| empleados             |       | solicitudes_vacaciones       |
|-----------------------|       |------------------------------|
| id (PK)               |<------| empleado_id (FK)             |
| rut (UNIQUE)          |       | id (PK)                      |
| nombre_completo       |       | cargo                        |
| cargo                 |       | fecha_inicio                 |
| fecha_ingreso         |       | fecha_fin                    |
| cumple_10_anos_base   |       | dias_habiles_consumidos      |
| dias_progresivos_base |       | fecha_solicitud              |
| created_at            |       | ruta_comprobante             |
+-----------------------+       +------------------------------+

+-----------------------+
| feriados (Caché)      |
|-----------------------|
| fecha (PK)            |
| descripcion           |
+-----------------------+
```

## Script DDL Completo

Ejecutar el siguiente script SQL en el servidor MySQL local para crear las tablas necesarias:

```sql
-- Tabla: empleados
CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(12) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    cumple_10_anos_base TINYINT(1) DEFAULT 0,
    dias_progresivos_base INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: feriados (Caché de API)
CREATE TABLE feriados (
    fecha DATE PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

-- Tabla: solicitudes_vacaciones
CREATE TABLE solicitudes_vacaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_habiles_consumidos INT NOT NULL,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ruta_comprobante VARCHAR(255) NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT
);
```

## Scripts ALTER TABLE

```sql
-- Índice para acelerar la búsqueda de historial de solicitudes y cálculo de saldos
ALTER TABLE solicitudes_vacaciones ADD INDEX idx_empleado (empleado_id);

-- Índice para búsquedas rápidas o validaciones por RUT en empleados
ALTER TABLE empleados ADD INDEX idx_rut (rut);
```

## Criterio de Éxito
- Las 3 tablas (`empleados`, `feriados`, `solicitudes_vacaciones`) creadas sin errores en MySQL local.
