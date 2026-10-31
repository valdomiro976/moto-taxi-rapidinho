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
- Mapa e cálculo de distância/rota. **Decisão: Google Maps Platform**
  (ver "Decisão sobre mapas" abaixo).
- Pagamento via Pix.
- Notificações push.

## Decisão sobre mapas

**Google Maps Platform**, mantido nos apps Android. A alternativa considerada era
OpenStreetMap (Leaflet no web, osmdroid no Android), e foi descartada.

Motivos da recusa do OSM:

- `tile.openstreetmap.org` **proíbe uso pesado** e não oferece SLA — pode bloquear
  o app sem aviso. Um app de transporte é justamente o perfil de uso pesado.
- A política do OSM também **proíbe uso offline e pré-carregamento de tiles**.
- Servidores públicos de demonstração (OSRM, Nominatim) **não podem** ser usados
  em produção.
- Trocar o cálculo de distância mudaria o **valor da corrida** — risco de negócio.

Ponto de custo que costuma motivar a migração e não se aplica aqui: o SKU
**Maps SDK** (a exibição do mapa no Android) é **ilimitado e gratuito**. Apenas
as APIs de serviço são cobradas, com 10.000 chamadas grátis por mês cada:
Geocoding, Compute Routes, Places.

A conta de faturamento do Google Cloud é de titularidade do contratante, que
acompanha o consumo. Se o faturamento falhar, as APIs são desativadas e o app
perde as funcionalidades que dependem delas.

Se um dia a migração voltar à mesa, os provedores derivados do OSM indicados
pela própria fundação OSM para uso comercial são MapTiler, Stadia Maps,
LocationIQ, Geoapify e Thunderforest — ou hospedar tiles, OSRM e Nominatim.
