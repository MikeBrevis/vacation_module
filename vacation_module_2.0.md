# Project Specifications: Vacation Module — AndeCorp v2.0

**Subdomain:** `tools.andecorp.cl`
**Stack:** Vanilla JS + Bootstrap 5 / Node.js + Express 5 / MySQL 8 (Dockerized)

---

## Phase 1 — Scope and Business Rules (Updated)

### 1.1 Balance and Progressive Days Calculation
The system implements Chilean labor regulations (Articles 67 and 68 of the Labor Code) for calculating legal and progressive vacation days.

- **Legal Days**: 1.25 days per month worked (15 days annually).
- **Progressive Days**: 1 additional day for every 3 years worked at the current company, provided the employee proves a **10-year base (120 months)** of total contributions (across any employer).

### 1.2 External Experience Management (AFP)
To automate the 10-year base calculation, the system requests:
- **AFP Certificate Date**: The emission date of the contribution certificate.
- **Total Months Quoted**: The total sum of months contributed to the social security system.

**External Experience Formula:**
```
External Months = Total Months Quoted - Months worked at the company (as of the certificate date)
```
This logic allows for precise determination of when the employee reaches the 10-year milestone and begins accruing progressive days.

---

## Phase 2 — Database Modeling

### Table: `empleados` (Final Schema)

| Field | Type | Description |
|---|---|---|
| `id` | INT | PK, Auto-incremental |
| `rut` | VARCHAR(12) | UNIQUE, validated in real-time |
| `nombre_completo` | VARCHAR(150) | Minimum 2 words (First and Last Name) |
| `cargo` | VARCHAR(100) | Current position |
| `fecha_ingreso` | DATE | Contract start date |
| `cumple_10_anos_base`| TINYINT(1) | Manual flag for exceptional cases |
| `anos_externos` | INT | Calculated/entered previous years |
| `meses_externos` | INT | Additional previous months |
| `fecha_certificado` | DATE | AFP certificate emission date |
| `total_meses_cotizados`| INT | Total historical months according to AFP |

### Table: `solicitudes_vacaciones`
Includes a `periodo_asignado` (INT) field to link each request to a specific accrual year, allowing for detailed auditing by annual period.

---

## Phase 3 — Infrastructure and Docker

### 3.1 Containerization
The project is deployed using **Docker Compose**, orchestrating three services:
1.  **App**: Node.js server exposing the API and serving static Frontend files on port `3000`.
2.  **DB**: MySQL 8.0 database with volume persistence and automatic schema loading.
3.  **phpMyAdmin**: Web interface for database management on port `8080`.

### 3.2 Unified Node.js Server
`server.js` was optimized to act as a static file server:
```javascript
app.use(express.static(path.join(__dirname, '../'))); // Serves the frontend from the root
```

---

## Phase 4 — User Interface (Premium UI/UX)

### 4.1 Real-Time Validations
- **RUT**: Only numbers and the letter 'K' at the end. Automatic formatting (`12.345.678-9`).
- **Names/Positions**: Filter that prevents entering numbers.
- **Security**: Mandatory validation of "First and Last Name" (minimum two words).

### 4.2 Visual Effects and Interactivity
- **Elevation (Hover)**: Input fields and buttons feature `transform: translateY(-2px)` transitions and dynamic shadows.
- **Smart Menus**: Period selectors with hidden placeholders and browser autocomplete blocking to prevent visual interference.
- **Status Colors (Traffic Light)**:
  - **Green**: Periods with available days.
  - **Blue**: Historical 10-year compliance milestone.
  - **Red**: Exhausted periods.

---

## Phase 5 — Deployment and Maintenance

1.  **Holiday Synchronization**: Automatic (Cron) and manual process to keep the Chilean public holiday table updated.
2.  **PDF Generation**: Automatic creation of vacation receipts with a signature space for the worker.
3.  **Data Management**: Integrated phpMyAdmin for quick auditing of records and requests.

---
