---
name: otto-stock-dev
description: Orquestra o desenvolvimento de novas funcionalidades, endpoints, módulos, regras de negócio, migrações e testes no backend do Otto Stock (Node.js + Express + Prisma + PostgreSQL), incluindo a ponte com o frontend e o Nginx quando necessário. Use SEMPRE que o usuário pedir para criar, alterar, corrigir ou implementar rota, controller, service, schema Prisma, validação Zod, RBAC, rate limit, auditoria LGPD ou testes de API no Otto Stock, mesmo sem mencionar "backend" explicitamente. Para trabalho só de telas e componentes, use a skill otto-stock-web-dev.
---
# Otto Stock - Orquestrador de Backend

Atue como engenheiro de software sênior no backend do Otto Stock (gestão clínica e estoque). Entregue mudanças pequenas, testadas e consistentes com a arquitetura em camadas existente. Antes de criar algo novo, procure um controller, service, schema ou helper equivalente e reutilize.

## Stack

- Node.js 20 + Express 5 + TypeScript
- Prisma 5 + PostgreSQL 16
- Zod para validação de payloads
- JWT (`auth.middleware.ts`) + RBAC (`roleMiddleware`)
- `express-rate-limit` para limites de requisição
- Vitest + Supertest + `vitest-mock-extended`
- Docker Compose (containers `db`, `api`, `web`); API na porta 3000, Nginx na porta 80 fazendo proxy de `/api`

## Quando usar

- Criar ou alterar endpoint, controller, service, DTO ou schema Prisma.
- Ajustar RBAC, rate limit, tratamento de erros ou segurança.
- Atender uma pendência registrada em `PENDENCIAS_BACKEND.md` pelo frontend.
- Escrever ou corrigir testes de integração/unitários da API.
- Revisar o backend sob a ótica da LGPD.

## Pipeline

### 1. Arquitetura e impacto

- Levante requisitos e encaixe a funcionalidade na arquitetura em camadas (Routes → Controller → Service → DTO/Prisma).
- Defina quais perfis (ADMIN, GESTOR, ESTOQUISTA, ATENDENTE) acessam a rota. Aplique o princípio do menor privilégio.
- Se a mudança altera o contrato da API, avalie o impacto no frontend e planeje a transição retrocompatível (ver "Contratos e frontend").

### 2. Implementação

- **Banco**: atualize `schema.prisma` e gere a migração. Para campos novos em tabelas com dados, prefira valores que não quebrem registros legados (ex.: enum com `NAO_INFORMADA` em vez de default arbitrário). Não faça alterações destrutivas sem confirmar.
- **Validação**: schema Zod estrito para body, query e params; rejeite campos desconhecidos quando fizer sentido.
- **Lógica**: regras de negócio no Service; Controller apenas traduz HTTP ↔ Service.
- **Rotas e segurança**: registre em `routes.ts` com `auth.middleware.ts` (JWT) e `roleMiddleware` conforme os perfis definidos.
- **Erros**: sempre pelo `error-handler.ts` centralizado, com mensagens que não vazem dados internos ou pessoais.
- **Nginx**: confira se `/api/` precisa de tratamento especial (timeout, tamanho de corpo, cabeçalhos) e atualize o proxy só se a feature exigir.

### 3. Contratos e frontend

- O frontend (`otto-stock-web`, React + Vite) consome a API via instância Axios única. Mudanças de contrato devem ser retrocompatíveis até o frontend migrar: backend retrocompatível → frontend → backend definitivo.
- Endpoints de listagem novos ou ajustados devem prever paginação e filtros (ex.: `?ativo=`) para evitar over-fetching.
- Mantenha `PENDENCIAS_BACKEND.md` (raiz do repositório frontend, salvo se movido para `docs/`) coerente: ao concluir uma pendência, registre o contrato final.
- Decisões já acordadas (confira se mudaram): `especialidade` de Médico é `String?` livre; `unidade` de Insumo é enum com `NAO_INFORMADA` para legados, sem default "UN"; `/relatorios/movimentacoes-grafico` aceita dias de 1 a 90 e usa fuso fixo `America/Sao_Paulo`; `/pacientes` e `/medicos` têm paginação com transição retrocompatível.

### 4. Validação e QA

- Escreva testes de unidade e de integração com `vitest` e `supertest`; use `vitest-mock-extended` para mockar o Prisma. Nunca acesse banco real nos testes.
- Cubra: caminho feliz, payload inválido (Zod), sem token (401), perfil sem permissão (403) e regras de negócio nos limites.
- Rode a suíte completa e a checagem de tipos antes de concluir; corrija falhas em vez de ignorá-las.

## Segurança e rate limit

- `trust proxy` configurado em 1 (atrás do Nginx); mantenha para que o IP real seja usado nos limites.
- Login: 5 tentativas por minuto por IP + e-mail.
- Limite geral por usuário autenticado: 600 por 15 min em produção, configurável via `RATE_LIMIT_MAX` (3000 em desenvolvimento). Rotas novas herdam o limite geral; aplique limite mais estrito em rotas sensíveis ou custosas.
- Nunca desative o rate limit para "fazer o teste passar"; ajuste a configuração do ambiente de teste.

## LGPD

- Dados de pacientes são sensíveis: retorne apenas os campos necessários para cada perfil, não registre dados pessoais em logs nem em mensagens de erro e evite expor identificadores em URLs quando possível.
- Ao tocar em módulos com dados pessoais, verifique base de acesso por perfil, minimização de campos e rastreabilidade de ações relevantes.

## Gotchas

- Toda rota protegida valida payload com Zod **e** passa pelo middleware JWT; rotas restritas também passam pelo `roleMiddleware`.
- Erros sempre pelo `error-handler.ts`; não responda erro manualmente em controllers.
- Testes preservam as regras de negócio sem afetar instâncias reais de banco (mocks com Vitest).
- Não commite segredos, `.env` reais nem dumps de dados.
- Ao alterar o `schema.prisma`, lembre de regenerar o client e atualizar seeds e mocks dos testes.
