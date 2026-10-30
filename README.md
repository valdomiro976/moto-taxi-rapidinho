# MOTO-TAXI RAPIDINHO

Plataforma de moto-táxi: passageiro pede corrida, motoboy aceita, acompanhamento em tempo real.

> Este repositório foi preparado dentro de um ambiente de nuvem (sandbox Linux).
> Como o `H:` é uma unidade do seu computador Windows, ele **não** fica acessível
> daqui. Use o script `scripts/setup-windows.ps1` (veja "Como colocar em
> `H:\MOTO-TAXI-RAPIDINHO`") para materializar o projeto no seu disco.

## Estrutura

```
MOTO-TAXI-RAPIDINHO/
├── backend/          API REST (Node.js + Express + SQLite)
│   ├── src/routes/   health, auth, rides, admin
│   └── scripts/      create-admin.js
├── frontend/         PWA com dois módulos
│   ├── index.html    casca (login + área autenticada)
│   ├── styles.css
│   └── js/
│       ├── api.js        cliente da API + sessão
│       ├── ui.js         formatação (dinheiro, status, cartões)
│       ├── passenger.js  MÓDULO PASSAGEIRO
│       ├── driver.js     MÓDULO MOTORISTA
│       └── shell.js      login e troca de módulo
├── DASHBOARD/        Painel administrativo (servido em /dashboard)
│   ├── index.html
│   ├── css/dashboard.css
│   └── js/{api.js,dashboard.js}
├── docs/             Documentação e modelo de dados
├── scripts/          Scripts de instalação (Windows / Linux)
├── .gitignore
├── LICENSE
└── README.md
```

## Módulos

O sistema tem **dois módulos**, escolhidos pelo papel (`role`) do usuário no
cadastro:

| Módulo | Papel | O que faz |
|--------|-------|-----------|
| **Passageiro** | `passenger` | Pede corrida, acompanha o status e cancela |
| **Motorista** | `driver` | Vê a fila de corridas pendentes, aceita, inicia e conclui |

O backend reforça as regras — não é só a tela que esconde botões:

- `POST /api/rides` → apenas `passenger`
- `GET /api/rides/available` → apenas `driver`
- `PATCH /api/rides/:id/status` com `accepted` → apenas `driver`
- `in_progress` / `completed` → apenas o `driver` dono da corrida
- `canceled` → o `passenger` dono ou o `driver` dono

## Requisitos

- Node.js >= 20 (testado com v24)
- npm >= 10

## Como rodar (backend)

```bash
cd backend
npm install
npm test          # roda os testes automatizados
npm start         # sobe a API + o PWA em http://localhost:3000
```

O backend serve o frontend na mesma origem, então basta abrir
`http://localhost:3000` — não é preciso rodar um segundo servidor nem lidar
com CORS.

Endpoints:

| Método | Rota                     | Papel       | Descrição                              |
|--------|--------------------------|-------------|----------------------------------------|
| GET    | `/api/health`            | público     | Verificação de saúde                   |
| POST   | `/api/auth/register`     | público     | Cadastro (passageiro ou motorista)     |
| POST   | `/api/auth/login`        | público     | Login (retorna token JWT)              |
| GET    | `/api/rides`             | autenticado | Lista corridas                         |
| GET    | `/api/rides/available`   | motorista   | Fila de corridas pendentes             |
| GET    | `/api/rides/mine`        | autenticado | Corridas do próprio usuário            |
| POST   | `/api/rides`             | passageiro  | Cria uma corrida                       |
| GET    | `/api/rides/:id`         | autenticado | Detalhe da corrida                     |
| PATCH  | `/api/rides/:id/status`  | por papel   | Atualiza o status (ver "Módulos")      |
| GET    | `/api/admin/stats`       | admin       | Totais de usuários, corridas e receita |
| GET    | `/api/admin/users`       | admin       | Lista usuários (`?role=`)              |
| GET    | `/api/admin/rides`       | admin       | Lista corridas (`?status=`)            |

## Painel administrativo (DASHBOARD)

Painel web em `DASHBOARD/`, servido pelo backend em **`/dashboard`**. Mostra a
visão geral (corridas, usuários e faturamento concluído), a lista de corridas
com filtro por status e a lista de usuários com filtro por papel.

O papel `admin` **não** pode ser escolhido no cadastro da API. Crie o primeiro
administrador pelo script:

```bash
cd backend
node scripts/create-admin.js --email admin@exemplo.com --password "senha-forte" --name "Seu Nome"
```

Depois abra `http://localhost:3000/dashboard` e entre com esse e-mail e senha.
Rodar o script de novo com o mesmo e-mail apenas atualiza a senha.

## Como colocar em `H:\MOTO-TAXI-RAPIDINHO`

### Opção A — clonar do GitHub (recomendado)

Depois que este repositório for enviado ao GitHub:

```powershell
cd H:\
git clone <URL_DO_REPOSITORIO> MOTO-TAXI-RAPIDINHO
cd H:\MOTO-TAXI-RAPIDINHO
```

### Opção B — a partir deste sandbox

1. Baixe/exporte os arquivos deste repositório (por exemplo, um `.zip`).
2. No Windows, rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -Destination "H:\MOTO-TAXI-RAPIDINHO"
```

O script cria a pasta, copia os arquivos e roda `git init` + commit inicial.

## Próximos passos sugeridos

1. Definir identidade visual e nome do app.
2. Integrar mapa (Leaflet/OpenStreetMap) e cálculo de rota.
3. Fluxo de aceite da corrida pelo motoboy e status em tempo real (WebSocket).
4. Pagamentos (Pix) e avaliação mútua.
5. Publicar backend e frontend.

Veja `docs/ARQUITETURA.md` e `docs/MODELO-DE-DADOS.md`.

## Licença

MIT — veja `LICENSE`.
