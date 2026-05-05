# 🏖️ Vacation Module

A web-based employee vacation management system built for Chilean labor law compliance. It handles vacation day accrual (legal and progressive days), leave requests, automatic public holiday detection, and PDF receipt generation — all backed by a REST API.

---

## 🛠️ Technology Stack

### Frontend
| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Markup   | HTML5 (semantic)                                |
| Styling  | Vanilla CSS + Bootstrap 5                       |
| Scripts  | Vanilla JavaScript (ES6+, no framework)         |
| Calendar | [Flatpickr](https://flatpickr.js.org/) (locale: `es`) |
| Icons    | Bootstrap Icons                                 |

### Backend (`vacation_module_api/`)
| Layer        | Technology / Library                             |
|--------------|--------------------------------------------------|
| Runtime      | Node.js (CommonJS)                               |
| Framework    | Express 5                                        |
| Database     | MySQL via `mysql2`                               |
| PDF          | `pdfkit`                                         |
| HTTP Client  | `axios` (public holiday API sync)                |
| Scheduler    | `node-cron` (automatic holiday sync)             |
| Config       | `dotenv`                                         |

---

## 🏗️ Project Architecture

```
vacation_module/
│
├── index.html              # Employee list & management (add / edit / delete)
├── empleado.html           # Employee detail: balances, leave request form, history
├── logo.png                # Project logo
├── schema.sql              # Full database schema (run once to initialize)
│
├── assets/
│   ├── css/style.css       # Global stylesheet
│   └── js/
│       ├── api.js          # Centralized fetch wrapper for all API calls
│       ├── main.js         # Logic for index.html (table, modals)
│       └── empleado.js     # Logic for empleado.html (detail view, forms)
│
└── vacation_module_api/    # Express REST API
    ├── server.js           # App entry point, middleware, route mounting
    ├── config/db.js        # MySQL connection pool
    ├── routes/
    │   ├── empleados.js    # CRUD for employees + RUT validation
    │   ├── solicitudes.js  # Leave request creation, PDF, cancellation
    │   └── feriados.js     # Public holiday query endpoint
    ├── services/
    │   ├── vacacionesService.js  # Core balance + progressive days calculation
    │   ├── pdfService.js         # PDF receipt generation with pdfkit
    │   └── feriadosSync.js       # Syncs holidays from external API via cron
    ├── utils/
    │   └── rutUtils.js     # Custom Chilean RUT validation (normalization, formatting)
    ├── public/
    │   └── comprobantes/   # Generated PDF receipts (runtime, not committed)
    ├── .env.example        # Environment variable template
    └── package.json
```

---

## ✨ Key Features

- **Employee Registry** — Create, edit, and delete employees with Chilean RUT validation (supports all input formats, including `K` verifier digits).
- **Legal Vacation Balance** — Automatically accrues 1.25 days/month based on contract start date.
- **Progressive Vacation Days** — Implements Chilean Labor Code Article 68: employees gain +1 day per 3 years of service after a 10-year base. Supports AFP-certified external experience.
- **Leave Request Management** — Requests are validated against the employee's available balance. Only business days (excluding weekends and public holidays) are counted.
- **Public Holiday Awareness** — Holidays are synced automatically from an external API via a daily cron job and highlighted in the calendar picker.
- **PDF Receipt Generation** — Each approved leave request generates a downloadable PDF comprobante.
- **Historical Leave Entry** — Managers can register past vacation periods for record-keeping.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MySQL** server running locally

### 1. Clone the repository
```bash
git clone <repository-url>
cd vacation_module
```

### 2. Configure environment variables
```bash
cd vacation_module_api
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=vacation_db
FRONTEND_ORIGIN=http://127.0.0.1:5502
FERIADOS_API_KEY=your_api_key_here
```

### 3. Initialize the database
Run `schema.sql` in your MySQL client (phpMyAdmin or CLI):
```sql
SOURCE /path/to/vacation_module/schema.sql;
```

### 4. Install dependencies & start the API
```bash
cd vacation_module_api
npm install
node server.js
# → Server running on http://localhost:3000
```

### 5. Open the frontend
Serve the root `vacation_module/` folder with a static server (e.g. VS Code Live Server on port `5502`) and open `index.html` in your browser.

---

## 📡 API Endpoints

| Method | Endpoint                          | Description                                 |
|--------|-----------------------------------|---------------------------------------------|
| GET    | `/api/empleados`                  | List all employees with current balance     |
| GET    | `/api/empleados/:id`              | Employee detail + balance + leave history   |
| POST   | `/api/empleados`                  | Create employee                             |
| PUT    | `/api/empleados/:id`              | Update employee                             |
| DELETE | `/api/empleados/:id`              | Delete employee (with confirmation step)    |
| GET    | `/api/solicitudes/:id/pdf`        | Download PDF receipt for a leave request    |
| POST   | `/api/solicitudes`                | Create a new leave request                  |
| POST   | `/api/solicitudes/historico`      | Register a historical leave period          |
| DELETE | `/api/solicitudes/:id`            | Cancel (void) a leave request               |
| GET    | `/api/feriados`                   | List all synced public holidays             |

---

## 🗃️ Database Schema

Three tables power the module:

- **`empleados`** — Employee records, including RUT, start date, and AFP-certified prior experience fields (`anos_externos`, `meses_externos`, `cumple_10_anos_base`).
- **`solicitudes_vacaciones`** — All leave requests, linked to the employee, with business-day count and PDF path.
- **`feriados`** — Chilean public holidays, automatically populated by the cron service.

See [`schema.sql`](schema.sql) for the full definition.

---

## 💼 Progressive Vacation Logic (Chilean Law)

Progressive days are calculated per **Article 68 of the Chilean Labor Code**:

1. An employee needs a **10-year base** of contributions to qualify.
2. The base can be met by combining years at the current employer + AFP-certified prior experience.
3. Once the base is met, the employee earns **+1 additional day for every 3 years** worked at the current employer.
4. If the employee has certified their 10-year base externally (`cumple_10_anos_base = true`), progression starts counting from day one of their current contract.

---

## ⚙️ Environment Variables

| Variable            | Description                                           |
|---------------------|-------------------------------------------------------|
| `PORT`              | API server port (default: `3000`)                     |
| `DB_HOST`           | MySQL host                                            |
| `DB_USER`           | MySQL username                                        |
| `DB_PASS`           | MySQL password                                        |
| `DB_NAME`           | MySQL database name                                   |
| `FRONTEND_ORIGIN`   | Allowed CORS origin for the frontend                  |
| `FERIADOS_API_KEY`  | API key for the public holiday sync service           |

---
