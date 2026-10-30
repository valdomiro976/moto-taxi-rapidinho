# Arquitetura

## Visão geral

```
┌────────────────┐        HTTPS/JSON        ┌──────────────────┐
│  Frontend PWA  │  ───────────────────────▶│  API REST        │
│  (passageiro   │                          │  Node + Express  │
│   e motoboy)   │  ◀───────────────────────│                  │
└────────────────┘                          └────────┬─────────┘
        ▲                                            │
        │ WebSocket (tempo real, etapa futura)       │
        └────────────────────────────────────────────┘
                                                     │
                                              ┌──────▼──────┐
                                              │   SQLite    │
                                              └─────────────┘
```

## Componentes

### Backend (`backend/`)
- **Express 4** expõe a API REST em `/api`.
- **SQLite** (módulo nativo `node:sqlite`) guarda usuários e corridas.
- **JWT** para autenticação; senhas derivadas com `scrypt`.
- Separação `app.js` (aplicação) x `server.js` (processo) para testes.

### Apps dos módulos (`PASSAGEIRO/`, `MOTORISTA/`)
- PWAs em HTML/CSS/JS puro, sem build obrigatório, servidos pelo backend
  em `/passageiro` e `/motorista` (mesma origem da API, sem CORS).
- Cada um tem seu `index.html`, seu `manifest.webmanifest` e seu módulo:
  - `PASSAGEIRO/js/passageiro.js` — pedir corrida, acompanhar, cancelar.
  - `MOTORISTA/js/motorista.js` — fila de pendentes, aceitar, iniciar, concluir.
- A casca é comum (`COMPARTILHADO/js/shell.js`): login, sessão e montagem do
  módulo. Cada app cria seu cliente de API com um prefixo próprio
  (`createApi('motoTaxiPassenger')` / `createApi('motoTaxiDriver')`), de modo
  que as duas sessões não colidem no `localStorage`.
- `COMPARTILHADO/js/ui.js` centraliza formatação e cartões de corrida;
  `COMPARTILHADO/index.html` é o portal servido na raiz `/`.

### Painel administrativo (`DASHBOARD/`)
- HTML/CSS/JS puro, servido pelo backend em `/dashboard` (mesma origem da API).
- `dashboard.js` cuida de login, navegação e tabelas; `js/api.js` guarda a sessão
  do admin em `localStorage`.
- Consome `/api/admin/stats`, `/api/admin/rides` e `/api/admin/users`.
- Acesso restrito ao papel `admin`, validado no backend.

## Fluxo de uma corrida

1. Passageiro cria a corrida (`POST /api/rides`) informando origem e destino.
2. A corrida fica com status `requested`.
3. Motoboy lista corridas disponíveis e aceita (`PATCH /api/rides/:id/status`
   para `accepted`).
4. Status evolui: `accepted` → `in_progress` → `completed` (ou `canceled`).
5. Ao final, passageiro e motoboy podem se avaliar (etapa futura).

## Evolução planejada

- WebSocket para posição do motoboy em tempo real.
- Mapa (Leaflet + OpenStreetMap) e cálculo de distância/rota.
- Pagamento via Pix.
- Notificações push.
