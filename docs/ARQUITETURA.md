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

### Frontend (`frontend/`)
- PWA em HTML/CSS/JS puro, sem build obrigatório.
- **Dois módulos** carregados dinamicamente conforme `user.role`:
  - `passenger.js` — pedir corrida, acompanhar, cancelar.
  - `driver.js` — fila de pendentes, aceitar, iniciar, concluir.
- `shell.js` faz o login e monta o módulo; `api.js` guarda a sessão (JWT em
  `localStorage`); `ui.js` centraliza formatação.
- Servido pelo próprio backend na raiz (`/`), evitando CORS.

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
- Painel administrativo.
