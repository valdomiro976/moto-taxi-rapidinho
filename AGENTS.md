# AGENTS.md — MOTO-TAXI RAPIDINHO

Memória persistente do repositório para agentes (OpenHands) e pessoas.

## Visão geral

Aplicação de moto-táxi com dois perfis de usuário: **passageiro** e **motoboy**.
Backend em Node.js/Express com SQLite; apps web (PWA) em HTML/CSS/JS puro
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
├── app.js           # cria o app Express (sem escutar porta) + serve os 3 módulos
├── server.js        # sobe o servidor
├── db.js            # conexão e migrações do SQLite
├── middleware/      # autenticação, papéis
└── routes/          # health, auth, rides, admin
backend/scripts/     # create-admin.js (concede o papel admin)
COMPARTILHADO/       # assets comuns aos dois apps (servidos em /compartilhado)
├── index.html       # portal com um cartão por módulo
├── css/app.css
└── js/
    ├── api.js       # fábrica do cliente HTTP + sessão
    ├── ui.js        # formatação e cartões de corrida
    └── shell.js     # login e montagem do módulo
PASSAGEIRO/          # app do passageiro (servido em /passageiro)
├── index.html
└── js/passageiro.js # MÓDULO PASSAGEIRO
MOTORISTA/           # app do motorista (servido em /motorista)
├── index.html
└── js/motorista.js  # MÓDULO MOTORISTA
DASHBOARD/           # painel administrativo (servido em /dashboard)
docs/                # arquitetura e modelo de dados
scripts/             # instalação no Windows e no Linux
```

Cada app tem seu próprio HTML e sua própria chave de sessão no `localStorage`
(`motoTaxiPassenger*` e `motoTaxiDriver*`). Como os dois rodam na mesma origem,
chaves iguais fariam a sessão de um vazar para o outro. O `createApi(prefixo)`
de `COMPARTILHADO/js/api.js` recebe esse prefixo.

## Módulos e autorização

Três papéis, definidos por `users.role`: `passenger`, `driver` e `admin`.

Regras aplicadas **no backend** (o frontend só esconde botões):

| Ação | Quem pode |
|------|-----------|
| `POST /api/rides` | `passenger` |
| `GET /api/rides/available` | `driver` |
| `PATCH .../status` → `accepted` | `driver` (assume a corrida) |
| `PATCH .../status` → `in_progress`, `completed` | `driver` dono da corrida |
| `PATCH .../status` → `canceled` | `passenger` dono ou `driver` dono |
| `GET /api/admin/*` | `admin` |

O papel `admin` **nunca** vem do autocadastro: `POST /api/auth/register` só aceita
`passenger` ou `driver`. Admin é concedido apenas por `scripts/create-admin.js`,
que escreve direto no banco.

Ao adicionar um endpoint novo, decida explicitamente o papel com
`requireRole(...)` ou verifique a posse do recurso. Nunca confie só na UI.

## Decisões

- SQLite via `node:sqlite` (nativo do Node >= 22), sem dependências nativas
  para compilar.
- Autenticação com JWT; senhas com `scrypt`.
- `app.js` é separado de `server.js` para permitir testes sem abrir porta.
