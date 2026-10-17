# Otto Stock — Backend & Infraestrutura

API REST e orquestração Docker do sistema **Otto Stock**, desenvolvido para gestão clínica, controle de estoque de insumos hospitalares/laboratoriais, ficha técnica de exames e fluxo de atendimentos com baixa automática de materiais.

---

## Sumário

- [Visão Geral e Funcionalidades](#-visão-geral-e-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura e Estrutura de Pastas](#-arquitetura-e-estrutura-de-pastas)
- [Pré-requisitos](#-pré-requisitos)
- [Subindo o Projeto (Docker)](#-subindo-o-projeto-docker)
- [Desenvolvimento Local (Sem Docker na API)](#-desenvolvimento-local-sem-docker-na-api)
- [Acessando o Sistema e Credenciais Padrão](#-acessando-o-sistema-e-credenciais-padrão)
- [Controle de Acesso (RBAC Multi-Perfil)](#-controle-de-acesso-rbac-multi-perfil)
- [Resumo de Endpoints da API](#-resumo-de-endpoints-da-api)
- [Variáveis de Ambiente, Proxy Reverso e Rate Limiting](#-variáveis-de-ambiente-proxy-reverso-e-rate-limiting)
- [Scripts e Testes Automatizados](#-scripts-e-testes-automatizados)
- [Operação: Parada, Backup e Restauração](#-operação-parada-backup-e-restauração)
- [Documentação Complementar](#-documentação-complementar)

---

## Visão Geral e Funcionalidades

- **Autenticação & Gestão de Usuários:** Autenticação stateless via JWT (`HS256`) e controle de acesso baseado em múltiplos perfis por usuário (**RBAC Multi-Perfil**).
- **Catálogo de Insumos:** Cadastro completo de materiais com SKU, unidade de medida, categoria, fabricante, estoque mínimo e ativação/inativação lógica (*soft delete*).
- **Gestão de Exames e Ficha Técnica (`ExameInsumo`):** Cadastro de exames por código e departamento, vínculo dos insumos consumidos por procedimento e verificação em tempo real de disponibilidade de estoque (`GET /api/exames/:id/disponibilidade`).
- **Controle de Estoque:** Registro auditável de movimentações (`ENTRADA`, `SAIDA`, `AJUSTE`) vinculado ao usuário operador, consulta de saldo consolidado, alertas de estoque crítico/zerado e indicadores resumidos.
- **Pacientes, Médicos e Atendimentos:** Cadastro de pacientes e corpo clínico, abertura de atendimentos (`EM_ATENDIMENTO`), cancelamento motivado (`CANCELADO`) e finalização (`FINALIZADO`) com **baixa transacional automática** dos insumos exigidos pelo exame.
- **Relatórios e Dashboard:** Indicadores operacionais para acompanhamento de atendimentos, consumo e alertas de reposição.
- **Segurança & Resiliência:** Validação estrita de payloads e variáveis de ambiente com **Zod**, headers HTTP seguros com **Helmet**, **Rate Limiting** em múltiplas camadas (por usuário autenticado, por IP anônimo e tripla proteção contra força bruta no login com chaves anonimizadas via `HMAC-SHA256`) e *graceful shutdown*.

---

## Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Runtime & Linguagem** | Node.js 20 (`node:20-slim`), TypeScript 5.9 |
| **Framework HTTP** | Express 5, CORS, Helmet, Express Rate Limit |
| **Banco de Dados & ORM** | PostgreSQL 16 (`postgres:16-alpine`), Prisma ORM 5.22 |
| **Validação & Segurança** | Zod 4, JSON Web Token (`jsonwebtoken`), Bcrypt |
| **Documentação da API** | Swagger (`swagger-jsdoc`, `swagger-ui-express`) |
| **Testes** | Vitest, Supertest, `vitest-mock-extended` |
| **Infraestrutura** | Docker, Docker Compose, Nginx (Reverse Proxy + Frontend) |

---

## Arquitetura e Estrutura de Pastas

O projeto adota uma **Arquitetura em Camadas (Layered Architecture)** modularizada por domínio de negócio:

```text
Otto-stock-backend/
├── docs/                        # Documentação técnica complementar
├── nginx/                       # Configuração do proxy reverso Nginx
├── prisma/
│   ├── migrations/              # Histórico de migrações SQL do Prisma
│   ├── schema.prisma            # Modelagem de dados e enums do PostgreSQL
│   └── seed.ts                  # Criação automática do usuário ADMIN inicial
├── src/
│   ├── database/
│   │   └── prisma.ts            # Instância singleton do PrismaClient
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # Validação JWT e autorização RBAC (roleMiddleware)
│   │   ├── error-handler.ts     # Tratamento centralizado de erros e ZodError
│   │   └── rate-limit.middleware.ts # Limites de requisição global e de login
│   ├── modules/                 # Domínios da aplicação (controller, service, routes, dto)
│   │   ├── atendimentos/
│   │   ├── auth/
│   │   ├── estoque/
│   │   ├── exame-insumo/
│   │   ├── exames/
│   │   ├── insumos/
│   │   ├── medicos/
│   │   ├── pacientes/
│   │   ├── relatorios/
│   │   └── usuarios/
│   ├── env.ts                   # Schema e validação fail-safe de variáveis de ambiente
│   ├── routes.ts                # Registro central de rotas e middlewares de acesso
│   ├── server.ts                # Bootstrap do Express, Healthcheck, Swagger e Shutdown
│   └── swagger.ts               # Configuração OpenAPI 3.0
├── API_CONTRACT.md              # Especificação detalhada de todos os endpoints e payloads
├── Dockerfile                   # Build multi-stage (builder + produção não-root)
├── docker-compose.yml           # Orquestração base (db, api, web/nginx)
├── docker-compose.override.yml  # Override automático local (expõe porta 3000 da API)
├── docker-compose.dev.yml       # Ambiente de desenvolvimento com hot-reload e volumes
└── entrypoint.sh                # Script de inicialização (migrations + seed + start)
```

---

## Pré-requisitos

- **Com Docker (Recomendado):**
  - [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/) instalados.
  - Para subir o serviço `web` junto à stack completa, o repositório do frontend (`../Otto-stock-frontend/otto-stock-web`) deve estar no mesmo diretório pai deste repositório.
- **Para execução local fora do Docker:**
  - Node.js **20+** (veja `.nvmrc`) e npm.
  - Instância do PostgreSQL 16 acessível.

---

## Subindo o Projeto (Docker)

1. **Configurar variáveis de ambiente:**
   Copie o arquivo de exemplo e ajuste os valores conforme necessário (especialmente `JWT_SECRET` em produção):
   ```bash
   cp .env.example .env
   ```

2. **Subir os containers:**
   - **Desenvolvimento local (carrega automaticamente `docker-compose.override.yml`, publicando a API em `3000:3000` e o Nginx em `80:80`):**
     ```bash
     docker compose up -d --build
     ```
   - **Produção (sem expor a porta 3000 da API para o host; acesso externo apenas via Nginx na porta 80):**
     ```bash
     docker compose -f docker-compose.yml up -d --build
     ```
   - **Desenvolvimento com Hot-Reload (API em `3000`, Vite em `5173` e PostgreSQL em `5432`):**
     ```bash
     docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
     ```

   > **Nota:** Ao iniciar o container da `api`, o script `entrypoint.sh` executa automaticamente `npx prisma migrate deploy` e `npx prisma db seed`. Caso deseje rodar o seed manualmente:
   > ```bash
   > docker compose exec api npx prisma db seed
   > ```

3. **Acompanhar os logs:**
   ```bash
   docker compose logs -f
   ```

---

## Desenvolvimento Local (Sem Docker na API)

Caso prefira rodar apenas o banco de dados no Docker e executar a API diretamente na sua máquina:

1. Suba o banco de dados PostgreSQL:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
   ```
2. No seu `.env`, descomente e configure `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinica?schema=public
   ```
3. Instale as dependências, aplique as migrações e popule o banco:
   ```bash
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   ```
4. Inicie o servidor em modo watch:
   ```bash
   npm run dev
   ```

---

## Acessando o Sistema e Credenciais Padrão

### URLs Principais
- **Frontend (via Nginx):** `http://localhost/`
- **Backend API (via Nginx):** `http://localhost/api/`
- **Backend API (Direto em dev):** `http://localhost:3000/api/`
- **Documentação Interativa (Swagger UI):** `http://localhost/api/docs/` (ou `http://localhost:3000/api/docs/`)
- **Healthcheck:** `http://localhost/api/health` (ou `http://localhost:3000/health`)

### Credenciais Iniciais (Seed)
Quando o banco de dados está vazio, o seed cria automaticamente o usuário administrador inicial (customizável via `ADMIN_EMAIL` e `ADMIN_PASSWORD`):
- **E-mail:** `admin@clinica.com`
- **Senha:** `admin123`
- **Perfis:** `["ADMIN"]`

---

## Controle de Acesso (RBAC Multi-Perfil)

Cada usuário pode possuir um ou mais perfis (`perfis: Perfil[]`). O acesso a um módulo é concedido se o usuário possuir **qualquer um** dos perfis exigidos pela rota:

| Módulo / Prefixo | `ADMIN` | `GESTOR` | `ESTOQUISTA` | `ATENDENTE` |
| :--- | :---: | :---: | :---: | :---: |
| `/api/usuarios` | ✅ | ❌ | ❌ | ❌ |
| `/api/pacientes` | ✅ | ✅ | ❌ | ✅ |
| `/api/medicos` | ✅ | ✅ | ❌ | ✅ |
| `/api/atendimentos` | ✅ | ✅ | ❌ | ✅ |
| `/api/insumos` | ✅ | ✅ | ✅ | ❌ |
| `/api/exame-insumos` | ✅ | ✅ | ✅ | ❌ |
| `/api/estoque` (Consultas: `/saldo`, `/resumo`, `/movimentacoes`) | ✅ | ✅ | ✅ | ❌ |
| `/api/estoque` (Operações: `/entrada`, `/saida`, `/ajuste`) | ✅ | ❌ | ✅ | ❌ |
| `/api/exames` (Leitura e `/disponibilidade`) | ✅ | ✅ | ✅ | ✅ |
| `/api/exames` (Criação, Edição e Exclusão) | ✅ | ✅ | ✅ | ❌ |
| `/api/relatorios` (`/dashboard`) | ✅ | ✅ | ✅ | ✅ |

---

## Resumo de Endpoints da API

Todas as rotas protegidas exigem o header `Authorization: Bearer <token_jwt>`. Para exemplos completos de payloads e respostas, consulte o arquivo [`API_CONTRACT.md`](API_CONTRACT.md).

| Módulo | Principais Rotas | Descrição |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/login` | Autentica o usuário e retorna o token JWT (validade de 8h) e os perfis. |
| **Usuários** | `GET, POST /api/usuarios`<br>`GET, PUT, DELETE /api/usuarios/:id`<br>`PATCH /api/usuarios/:id/perfis` | Gerenciamento de contas de usuários, ativação/inativação e atribuição de múltiplos perfis. |
| **Pacientes** | `GET, POST /api/pacientes`<br>`GET, PUT, DELETE /api/pacientes/:id` | Cadastro, busca paginada e atualização de pacientes da clínica. |
| **Médicos** | `GET, POST /api/medicos`<br>`GET, PUT, DELETE /api/medicos/:id` | Cadastro e gestão de médicos solicitantes/executantes (CRM). |
| **Insumos** | `GET, POST /api/insumos`<br>`GET, PUT, DELETE /api/insumos/:id` | Catálogo de insumos, SKU, unidade, estoque mínimo e status. |
| **Exames** | `GET, POST /api/exames`<br>`GET, PUT, DELETE /api/exames/:id`<br>`GET /api/exames/:id/disponibilidade` | Gestão de exames e checagem de disponibilidade de insumos em estoque para realização do exame. |
| **Ficha Técnica** | `GET, POST /api/exame-insumos`<br>`GET /api/exame-insumos/exame/:exameId`<br>`PUT, DELETE /api/exame-insumos/:id` | Vínculo e quantidade de insumos consumidos por cada tipo de exame. |
| **Estoque** | `POST /api/estoque/entrada`<br>`POST /api/estoque/saida`<br>`POST /api/estoque/ajuste`<br>`GET /api/estoque/saldo`<br>`GET /api/estoque/resumo`<br>`GET /api/estoque/movimentacoes` | Operações de entrada, baixa manual e ajuste de inventário; saldo atual por insumo, resumo de alertas e histórico auditável. |
| **Atendimentos** | `GET, POST /api/atendimentos`<br>`GET /api/atendimentos/resumo`<br>`GET /api/atendimentos/:id`<br>`PATCH /api/atendimentos/:id/finalizar`<br>`PATCH /api/atendimentos/:id/cancelar` | Fluxo completo de atendimento com baixa automática de estoque ao finalizar. |
| **Relatórios** | `GET /api/relatorios/dashboard` | Dados consolidados para o painel gerencial. |

---

## Variáveis de Ambiente, Proxy Reverso e Rate Limiting

As variáveis de ambiente são validadas na inicialização (`src/env.ts`). Caso alguma variável obrigatória esteja ausente ou fora do formato esperado, a aplicação encerra imediatamente com log detalhado do erro.

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Ambiente de execução (`development`, `production`, `test`). *Fail-safe*: se omitido, assume `production`. |
| `PORT` | `3000` | Porta HTTP interna na qual o servidor Express escuta. |
| `DATABASE_URL` | *(obrigatória)* | URL de conexão com o PostgreSQL (montada automaticamente no `docker-compose.yml` a partir de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`). |
| `JWT_SECRET` | *(obrigatória)* | Chave secreta para assinatura e verificação de tokens JWT (mínimo de 10 caracteres). |
| `CORS_ORIGINS` | `*` | Origens permitidas no CORS (separadas por vírgula ou `*` para qualquer origem). |
| `TRUST_PROXY` | `1` | Número de saltos de proxy reverso confiáveis para extração do IP real via `X-Forwarded-For`. Com apenas o Nginx do Docker Compose, mantenha `1`. Caso a aplicação fique atrás de outro balanceador/CDN (ex.: Cloudflare, AWS ALB, Traefik + Nginx), ajuste para o total de proxies confiáveis (ex.: `2`). |
| `RATE_LIMIT_MAX` | `600` (prod) / `3000` (dev) | Limite de requisições por janela de **15 minutos** por **usuário autenticado** (`user:<id>`). Validado entre `10` e `100000`. O limite de `3000` só é aplicado se `NODE_ENV === "development"` exatamente. |
| `RATE_LIMIT_ANON_MAX` | `120` (prod) / `600` (dev) | Limite de requisições por janela de **15 minutos** por **IP** para visitantes não autenticados (ou tokens inválidos/expirados). Validado entre `10` e `100000`. |
| `RATE_LIMIT_KEY_SECRET` | *(fallback para `JWT_SECRET`)* | Segredo (mínimo 10 caracteres) usado para gerar hashes `HMAC-SHA256` de e-mails e IPs nas chaves e logs do rate limit, garantindo que dados sensíveis nunca fiquem em texto puro na memória ou em logs. |

### Regras de Proteção de Login (`POST /api/auth/login`)
Todas as três camadas abaixo utilizam `skipSuccessfulRequests: true` (apenas tentativas com falha consomem a franquia):
1. **Por IP + E-mail (`HMAC-SHA256`):** máx. **5 falhas / minuto**.
2. **Por IP (todos os e-mails):** máx. **20 falhas / minuto** (mitigação de *credential stuffing* a partir de um único IP).
3. **Por E-mail (todos os IPs):** máx. **10 falhas / 15 minutos** (mitigação de força bruta distribuída contra uma mesma conta).

### Armazenamento dos Contadores (In-Memory Store)
- Os contadores de rate limit são mantidos **em memória** (`MemoryStore` padrão do `express-rate-limit`) no processo da API e **zeram em caso de restart/redeploy** do container.
- Esse modelo é adequado para execução em instância única da API. Caso a arquitetura evolua para **múltiplas réplicas/instâncias horizontais**, recomenda-se plugar um store compartilhado (como **Redis** via `rate-limit-redis`).

---

## Scripts e Testes Automatizados

No diretório raiz do projeto, os seguintes comandos npm estão disponíveis:

```bash
# Inicia o servidor em modo de desenvolvimento com hot-reload (tsx watch)
npm run dev

# Verifica tipos e compila o projeto TypeScript (sem emitir arquivos)
npm run build
npm run lint

# Executa a suíte de testes unitários (Vitest)
npm test

# Executa os testes em modo interativo (watch)
npm run test:watch
```

---

## Operação: Parada, Backup e Restauração

### Parando o sistema
Para parar os containers preservando os dados do banco:
```bash
docker compose stop
```

Para derrubar os containers, redes e **APAGAR** o volume do banco de dados (**Cuidado!**):
```bash
docker compose down -v
```

### Backup e Restauração do PostgreSQL

**Gerar Backup:**
```bash
docker compose exec db pg_dump -U postgres -d clinica > backup.sql
```

**Restaurar Backup:**
```bash
cat backup.sql | docker compose exec -T db psql -U postgres -d clinica
```

---

## Documentação Complementar

- [**Contrato da API (`API_CONTRACT.md`)**](API_CONTRACT.md): Especificação detalhada de todas as rotas, parâmetros de query, paginação, exemplos de payloads JSON e códigos de erro HTTP.
- [**Documentação Técnica (`docs/OTTO_STOCK_BACKEND_DOCUMENTATION.md`)**](docs/OTTO_STOCK_BACKEND_DOCUMENTATION.md): Visão arquitetural e fluxos de domínio do backend.
