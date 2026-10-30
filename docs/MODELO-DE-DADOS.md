# Modelo de dados

Banco: SQLite (`backend/data/moto-taxi.sqlite`).

## `users`

| Coluna       | Tipo     | Observações                                   |
|--------------|----------|-----------------------------------------------|
| `id`         | INTEGER  | PK, autoincremento                            |
| `name`       | TEXT     | obrigatório                                   |
| `email`      | TEXT     | obrigatório, único                            |
| `phone`      | TEXT     | opcional                                      |
| `password_hash` | TEXT  | `scrypt`, formato `salt:hash`                 |
| `role`       | TEXT     | `passenger` ou `driver`                       |
| `created_at` | TEXT     | ISO 8601 UTC                                  |

## `rides`

| Coluna         | Tipo    | Observações                                          |
|----------------|---------|------------------------------------------------------|
| `id`           | INTEGER | PK, autoincremento                                   |
| `passenger_id` | INTEGER | FK → `users.id`                                      |
| `driver_id`    | INTEGER | FK → `users.id`, nulo até ser aceita                 |
| `origin`       | TEXT    | endereço/coordenadas de origem                       |
| `destination`  | TEXT    | endereço/coordenadas de destino                      |
| `status`       | TEXT    | `requested`, `accepted`, `in_progress`, `completed`, `canceled` |
| `price_cents`  | INTEGER | preço em centavos                                    |
| `created_at`   | TEXT    | ISO 8601 UTC                                         |
| `updated_at`   | TEXT    | ISO 8601 UTC                                         |

## Índices

- `users(email)` único.
- `rides(status)`.
- `rides(passenger_id)`.

## Regras

- Preços sempre em centavos (inteiro).
- Transições de status permitidas:
  `requested → accepted → in_progress → completed`;
  `requested|accepted → canceled`.
