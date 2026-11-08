# StockPilot REST API

Base URL: `http://localhost:3000/api`

Successful JSON responses use `{ "success": true, "data": ... }`. Product collections also contain `pagination`. Errors use `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`. Deletes return HTTP 204 without a body.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Database-aware health check |
| GET, POST | `/categories` | List or create categories |
| GET, PUT, DELETE | `/categories/:id` | Read, replace, or delete an unused category |
| GET, POST | `/suppliers` | Search/list or create suppliers |
| GET, PUT, DELETE | `/suppliers/:id` | Read, replace, or delete an unused supplier |
| GET, POST | `/products` | Filter/list or create products |
| GET, PUT, DELETE | `/products/:id` | Read, replace metadata, or delete a history-free product |
| GET, POST | `/products/:id/stock-movements` | Product history or atomic stock movement |
| GET | `/stock-movements` | Latest movement history, up to 100 rows |
| GET | `/dashboard/stats` | Aggregates and products needing restock |
| GET | `/dashboard/recent-movements` | Ten latest movements |

## Products

`GET /products` accepts `page` (default 1), `limit` (1–100, default 10), `search`, `categoryId`, `status` (`ACTIVE`, `INACTIVE`), `stock` (`LOW`, `OUT`, `OK`), `sort` (`name`, `quantity`, `price`, `date`), and `order` (`asc`, `desc`). Search covers names and SKUs and treats `%` and `_` literally.

Create request fields are `sku`, `name`, optional `description`, `categoryId`, nullable `supplierId`, `costPrice`, `sellingPrice`, `quantity`, `reorderLevel`, and `status`. Money is integer cents. Updates use the same fields except `quantity`; unknown fields are rejected.

```bash
curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d '{"sku":"CAB-001","name":"USB-C Cable","description":"1 metre","categoryId":1,"supplierId":1,"costPrice":120000,"sellingPrice":175000,"quantity":20,"reorderLevel":5,"status":"ACTIVE"}'
curl "http://localhost:3000/api/products?search=cable&status=ACTIVE&sort=quantity&order=asc&page=1&limit=10"
curl -X PUT http://localhost:3000/api/products/1 -H "Content-Type: application/json" -d '{"sku":"CAB-001","name":"USB-C Cable","description":"2 metre","categoryId":1,"supplierId":1,"costPrice":140000,"sellingPrice":195000,"reorderLevel":5,"status":"ACTIVE"}'
```

## Categories and suppliers

Categories require `name` (1–100 characters) and accept `description` (up to 500). Category names are unique case-insensitively. Suppliers require `name` (1–120) and accept `contactPerson`, `email`, `phone`, and `address`. Email, when present, must be valid. `GET /suppliers?search=term` searches names.

```bash
curl -X POST http://localhost:3000/api/categories -H "Content-Type: application/json" -d '{"name":"Cables","description":"Data and power cables"}'
curl -X POST http://localhost:3000/api/suppliers -H "Content-Type: application/json" -d '{"name":"Metro Supply","contactPerson":"Amal","email":"amal@metro.example","phone":"+94 11 555 0100","address":"Colombo"}'
curl -X DELETE http://localhost:3000/api/categories/3
```

Referenced categories and suppliers return HTTP 409 instead of being deleted.

## Stock movements

Post `type` (`IN` or `OUT`), a positive integer `quantity`, and an optional note up to 500 characters. An `OUT` greater than available stock returns 409 and changes nothing. Movement records cannot be edited or deleted through the API.

```bash
curl -X POST http://localhost:3000/api/products/1/stock-movements -H "Content-Type: application/json" -d '{"type":"IN","quantity":12,"note":"Purchase order PO-1042"}'
curl -X POST http://localhost:3000/api/products/1/stock-movements -H "Content-Type: application/json" -d '{"type":"OUT","quantity":2,"note":"Customer order SO-88"}'
curl http://localhost:3000/api/products/1/stock-movements
```

## Status codes and validation

- `200`: retrieval or update
- `201`: created product, category, supplier, or movement
- `204`: deletion
- `400`: validation failure or malformed JSON
- `404`: resource or route not found
- `409`: uniqueness, relationship, stock, or history conflict
- `413`: JSON body exceeds 100 KB
- `500`: unexpected server failure

The server rejects unknown JSON fields, client-generated IDs and timestamps, invalid foreign keys, unsafe filter values, negative values, fractional quantities, and direct balance updates.
