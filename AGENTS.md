# AGENTS.md — MOTO-TAXI RAPIDINHO

Memória persistente do repositório para agentes (OpenHands) e pessoas.

## Visão geral

Aplicação de moto-táxi com dois perfis de usuário: **passageiro** e **motoboy**.
Backend em Node.js/Express com SQLite; frontend web (PWA) em HTML/CSS/JS puro
(sem framework, para facilitar a evolução e o deploy).

## Comandos

Backend (a partir de `backend/`):

```bash
npm install       # instala dependências
npm test          # roda os testes (node:test)
npm start         # sobe a API em http://localhost:3000
npm run dev       # modo watch (node --watch)
```

## Convenções

- Idioma do produto e da documentação: **português (pt-BR)**.
- Código, nomes de variáveis, rotas e identificadores: **inglês**.
- Testes ficam em `backend/tests/` e usam `node:test` (sem dependências extras).
- Dinheiro é armazenado em **centavos** (inteiro), nunca em ponto flutuante.
- Datas em ISO 8601 UTC.
- O banco fica em `backend/data/moto-taxi.sqlite` e é ignorado pelo git.

## Estrutura

```
backend/src/
├── app.js           # cria o app Express (sem escutar porta) + serve o frontend
├── server.js        # sobe o servidor
├── db.js            # conexão e migrações do SQLite
├── middleware/      # autenticação, papéis
└── routes/          # health, auth, rides
frontend/
├── index.html       # casca (login + área autenticada)
├── styles.css
└── js/
    ├── api.js       # cliente HTTP + sessão
    ├── ui.js        # formatação e cartões de corrida
    ├── passenger.js # MÓDULO PASSAGEIRO
    ├── driver.js    # MÓDULO MOTORISTA
    └── shell.js     # login e troca de módulo
docs/                # arquitetura e modelo de dados
scripts/             # instalação no Windows e no Linux
```

## Módulos e autorização

Dois módulos, definidos por `users.role`: `passenger` e `driver`.

Regras aplicadas **no backend** (o frontend só esconde botões):

| Ação | Quem pode |
|------|-----------|
| `POST /api/rides` | `passenger` |
| `GET /api/rides/available` | `driver` |
| `PATCH .../status` → `accepted` | `driver` (assume a corrida) |
| `PATCH .../status` → `in_progress`, `completed` | `driver` dono da corrida |
| `PATCH .../status` → `canceled` | `passenger` dono ou `driver` dono |

Ao adicionar um endpoint novo, decida explicitamente o papel com
`requireRole(...)` ou verifique a posse do recurso. Nunca confie só na UI.

## Decisões

- SQLite via `node:sqlite` (nativo do Node >= 22), sem dependências nativas
  para compilar.
- Autenticação com JWT; senhas com `scrypt`.
- `app.js` é separado de `server.js` para permitir testes sem abrir porta.
