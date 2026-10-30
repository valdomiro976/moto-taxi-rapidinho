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
├── frontend/         Aplicação web (PWA) do passageiro e do motoboy
├── docs/             Documentação e modelo de dados
├── scripts/          Scripts de instalação (Windows / Linux)
├── .gitignore
├── LICENSE
└── README.md
```

## Requisitos

- Node.js >= 20 (testado com v24)
- npm >= 10

## Como rodar (backend)

```bash
cd backend
npm install
npm test          # roda os testes automatizados
npm start         # sobe a API em http://localhost:3000
```

Endpoints iniciais:

| Método | Rota                     | Descrição                              |
|--------|--------------------------|----------------------------------------|
| GET    | `/api/health`            | Verificação de saúde                   |
| POST   | `/api/auth/register`     | Cadastro de passageiro                 |
| POST   | `/api/auth/login`        | Login (retorna token JWT)              |
| GET    | `/api/rides`             | Lista corridas                         |
| POST   | `/api/rides`             | Cria uma corrida                       |
| GET    | `/api/rides/:id`         | Detalhe da corrida                     |
| PATCH  | `/api/rides/:id/status`  | Atualiza o status da corrida           |

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
