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

## Publicação no Google Play (apps Android)

Os apps Android **não ficam neste repositório**. Eles vivem na máquina do
desenvolvedor, em `H:\MOTO-TAXI-RAPIDINHO\`:

| Pasta | App | Pacote |
|-------|-----|--------|
| `1_android-motorista` | Motorista | `com.taxirapidinho.motorista` |
| `1_android-passageiro_FINAL_PIX_OK` | Passageiro | `com.taxirapidinho.passageiro` |

Este repositório é só o **backend + frontend web (PWA)**.

### Requisitos atuais da loja

- `targetSdkVersion 36` (Android 16) — obrigatório desde 31/08/2026 para novos
  envios e atualizações.
- `minSdkVersion 24` — exigido pela Proteção Automática do Google Play.
- `versionCode` **sempre crescente**; o Play rejeita número já usado, inclusive
  de envios que ainda estão em análise.

### Assinatura

Cada app tem seu próprio keystore em `app/jks/`, e o **alias e a senha ficam em
`app/build.gradle`** (texto puro — mover para `keystore.properties` fora do git).
O keystore correto é o que casa com o *certificado de upload* do Play Console:

| App | Arquivo | Alias | SHA1 (upload) |
|-----|---------|-------|---------------|
| Motorista | `key_app_motorista.jks` | `key_motorista` | `30:FC:26:EF:0A:69:9E:40:3A:AD:DE:AA:45:13:B7:40:E1:CA:D0:37` |
| Passageiro | `key_taxi.jks` | `key_taxi` | `FA:C2:32:7D:C8:11:BA:9C:69:84:64:4A:F3:52:C0:C1:86:7B:0B:77` |

Ambos são **PKCS12**. O `keytool` do Java 8 responde `Invalid keystore format`
ou `parseAlgParameters failed` nesses arquivos — usar o do JDK 18
(`%JAVA_HOME%\bin\keytool.exe`), que é o mesmo que o `gradlew` usa.

Ao enviar, confirme **na página do app certo** no Play Console (comparar o nome
do pacote, não o nome exibido): enviar o AAB do motorista na página do passageiro
gera o erro "precisa ter o nome de pacote com.taxirapidinho.passageiro".

### Documentos legais

O site oficial (`taxirapidinho.com.br`) está fora do ar desde 2026 (DNS aponta
para um Traefik com certificado autoassinado, todas as rotas em 404). Por isso as
páginas exigidas pelo Play são publicadas via **GitHub Pages**, a partir de
`docs/`:

```
https://valdomiro976.github.io/moto-taxi-rapidinho/privacy/
https://valdomiro976.github.io/moto-taxi-rapidinho/termos/
https://valdomiro976.github.io/moto-taxi-rapidinho/exclusao-de-conta/
https://valdomiro976.github.io/moto-taxi-rapidinho/motorista/privacy/   (etc.)
```

O Pages é servido da branch `main`, pasta `/docs`. O `docs/` já continha a
documentação de arquitetura, então as páginas HTML convivem com ela.

### Conta de desenvolvedor

A política de contas inativas exige **as duas** condições: verificar e-mail e
telefone em *Conta de desenvolvedor → Detalhes da conta* **e** publicar um app ou
atualização. Publicar em teste interno também conta. A conta pode voltar a ficar
inativa depois.
