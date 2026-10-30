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
- Telas: login/cadastro, pedido de corrida, acompanhamento.
- Consome a API em `http://localhost:3000/api` (configurável).

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
