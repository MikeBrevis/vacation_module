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

### Containerization
| Tool           | Purpose                                         |
|----------------|-------------------------------------------------|
| Docker         | Application isolation and deployment            |
| Docker Compose | Multi-container orchestration (App + DB + PMA) |
| phpMyAdmin     | Web-based database management                   |

---

## 🏗️ Project Architecture

```
vacation_module/
│
├── index.html              # Employee list & management (add / edit / delete)
├── empleado.html           # Employee detail: balances, leave request form, history
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Orchestration for App, MySQL and phpMyAdmin
├── schema.sql              # Full database schema
│
├── assets/
│   ├── css/style.css       # Global stylesheet (with custom premium effects)
│   └── js/
│       ├── api.js          # Centralized fetch wrapper for all API calls
│       ├── main.js         # Logic for index.html (table, modals, validation)
│       └── empleado.js     # Logic for empleado.html (detail view, calculations)
│
└── vacation_module_api/    # Express REST API
    ├── server.js           # App entry point (serves both API and Frontend)
    ├── .env                # Environment variables (DB, API Keys)
    └── ...                 # routes, services, utils, etc.
```

---

## ✨ Key Features

- **Employee Registry** — Create and edit employees with real-time RUT validation and name/position filters.
- **Progressive Vacation Logic** — Implements Art. 68 of Chilean Labor Code. Calculates +1 day per 3 years after a 10-year contribution base.
- **AFP Certificate Integration** — Record certificate emission date and total months quoted to accurately calculate external experience.
- **Premium UI/UX** — Modern design with hover transitions, interactive cursors, and optimized dropdown menus.
- **Docker Ready** — Deploy the entire stack (App + MySQL + phpMyAdmin) with a single command.
- **PDF Generation** — Automatic leave receipt generation in PDF format.
- **Holiday Sync** — Automatic daily synchronization with Chilean public holidays API.

---

## 🚀 Getting Started (Docker - Recommended)

The easiest way to run the project is using Docker.

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 2. Clone and Start
```bash
git clone <repository-url>
cd vacation_module
docker-compose up --build
```

### 3. Access the services
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **phpMyAdmin**: [http://localhost:8080](http://localhost:8080) (User: `root`, Pass: `secret`)

---

## 🚀 Manual Installation

### 1. Prerequisites
- **Node.js** v18+
- **MySQL** 8.0+

### 2. Database Setup
Run `schema.sql` in your MySQL server to create the `vacation_db` and its tables.

### 3. API Configuration
1. Go to `vacation_module_api/`.
2. Create a `.env` file based on `.env.example`.
3. Configure your DB credentials and `FERIADOS_API_KEY`.

### 4. Start the Server
```bash
npm install
node server.js
```
The server will now serve both the API and the static frontend files on the configured port (default `3000`).

---

## 💼 Progressive Vacation Logic

1. **Base**: Requires 120 months (10 years) of total contributions (external + internal).
2. **Accrual**: After the base is met, the employee gains **1 additional day for every 3 years** of tenure in the current company.
3. **External Experience**: Calculated automatically by subtracting internal tenure from the "Total months quoted" provided in the AFP certificate.

---
