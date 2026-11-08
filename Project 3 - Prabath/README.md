# STOCKPILOT - Inventory Management System

StockPilot is a standalone database-driven web application created for DecodeLabs Full Stack Development Internship - Project 3: Database Integration. It helps a small business manage products, categories, suppliers, stock movements, inventory value, and restocking priorities from one responsive interface.

## Features

- Product CRUD with unique SKUs, search, filters, allowlisted sorting, and pagination
- Category and supplier management with protected relational references
- Transactional stock-in and stock-out with append-only history and negative-stock prevention
- Dashboard aggregates calculated directly from SQLite records
- Integer-cent LKR money storage and cost-based inventory valuation
- Server-side validation, database constraints, safe errors, and parameterized raw SQL
- Responsive vanilla HTML/CSS/JavaScript interface with accessible dialogs and feedback
- Repeatable optional demonstration seed and isolated API/database tests

## Technology

Node.js 24 LTS, Express 5, Node's maintained built-in SQLite driver (`node:sqlite`), raw SQL, HTML5, mobile-first CSS, vanilla JavaScript, Fetch API, and the Node.js test runner. There is no ORM, frontend framework, or mock persistence layer.

## Quick start

Requirements: Node.js 24 or newer and npm.

```bash
npm install
npm run db:init
npm run db:seed
npm start
```

Open `http://localhost:3000`. Seeding is optional and never runs automatically. `npm run db:init` is non-destructive and safe to repeat.

For automatic server restarts during development:

```bash
npm run dev
```

Configuration can be supplied as environment variables. Copy `.env.example` as a reference; Node does not automatically load it. The defaults are port `3000` and database `server/data/stockpilot.sqlite`. Money is consistently configured and documented as LKR in the frontend.

```powershell
$env:PORT=4000
$env:DB_PATH="./server/data/custom.sqlite"
npm start
```

## Testing

```bash
npm test
```

Tests use fresh SQLite files in the operating system temporary directory. They cover initialization, persistence, constraints, CRUD, duplicates, foreign keys, transaction rollback, stock safety, filtering, sorting, pagination, SQL-input safety, dashboard calculations, malformed requests, and direct quantity protection. Development data is not opened or modified.

## Architecture

```text
assets/                 favicon
css/                    responsive interface styles
js/                     UI controller and centralized API client
server/
  controllers/          HTTP request/response coordination
  database/             connection, schema, initializer, seed and data directory
  middleware/           validation and safe error responses
  repositories/         parameterized raw SQL and mappings
  routes/                REST endpoint definitions
  services/              inventory transactions and business rules
  utils/                 application errors
tests/                   isolated database and HTTP integration tests
docs/                    API and database reference
```

The schema contains `categories`, `suppliers`, `products`, and `stock_movements`. Categories and suppliers have one-to-many relationships with products; products have one-to-many movement history. Foreign keys and restrictions preserve those relationships. See [Database documentation](docs/DATABASE.md) and [API documentation](docs/API.md).

## Security and reliability

All user values are bound parameters. Dynamic sort expressions use a fixed allowlist. The JSON body is limited to 100 KB, unknown fields are rejected, errors do not expose SQL or stack traces, and Express's identifying header is disabled. Database checks are the final integrity layer. Stock updates and history inserts share an immediate transaction and guarded balance update.

No authentication or authorization is included because this internship project is designed for a trusted local demonstration environment. Add identity, role-based access, CSRF controls, TLS, audit identities, backups, and production monitoring before exposing it publicly. SQLite is appropriate for a small deployment with modest concurrent writes; a client/server database should be considered for high write concurrency. The currency is currently configured as LKR in the frontend and documented as such rather than dynamically negotiated per record.
