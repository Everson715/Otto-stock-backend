# Contrato da API (API Contract) - Otto Stock Backend

Este documento formaliza a especificação de interface da API REST do backend da clínica (**Otto Stock**), detalhando todas as rotas, métodos HTTP, autenticação, controle de acesso (RBAC Multi-Perfil), formatos de entrada e saída, parâmetros de paginação/filtro e notas de integração para consumo pelo Frontend (`otto-stock-web`).

---

## 1. Informações Gerais e Configuração

- **URL Base Direta (Desenvolvimento):** `http://localhost:3000/api`
- **URL Base via Reverse Proxy (Nginx / Produção Local):** `http://localhost/api`
- **Documentação Interativa (Swagger UI):** `http://localhost:3000/api/docs` (ou `http://localhost/api/docs`)
- **Health Check:** `GET /api/health` (ou `GET /health`) — público e isento de rate limit
- **Formato dos Dados:** `application/json` (UTF-8), limite de payload de `1mb`
- **Fuso Horário Operacional (Relatórios e Séries Temporais):** `America/Sao_Paulo` (configurável via `APP_TIMEZONE`)
- **CORS:** Habilitado conforme `CORS_ORIGINS` (padrão `*` em desenvolvimento, suportando `Origin: http://localhost:5173`).
- **Rate Limiting:**
  - **Geral (Autenticado):** `600` requisições por janela de 15 minutos por usuário (`user:<id>`) em produção (`3000`/15min quando `NODE_ENV=development`), configurável via `RATE_LIMIT_MAX`.
  - **Geral (Visitante Anônimo):** `120` requisições por janela de 15 minutos por IP em produção (`600`/15min quando `NODE_ENV=development`), configurável via `RATE_LIMIT_ANON_MAX`.
  - **Login (`POST /auth/login`):** 3 camadas simultâneas com `skipSuccessfulRequests: true` (apenas falhas consomem franquia) e chaves anonimizadas via `HMAC-SHA256`:
    1. **Por IP + E-mail:** máx. `5` falhas / minuto.
    2. **Por IP (todos os e-mails):** máx. `20` falhas / minuto.
    3. **Por E-mail (todos os IPs):** máx. `10` falhas / 15 minutos.

---

## 2. Autenticação, Credenciais de Teste e Controle de Acesso (RBAC)

### 2.1. Credenciais de Teste (Usuário Seed)

O banco de dados é inicializado automaticamente (`npx prisma db seed`) com o seguinte usuário administrador (customizável via `ADMIN_EMAIL` e `ADMIN_PASSWORD`) e um catálogo inicial de insumos com unidades de medida reais:
- **E-mail:** `admin@clinica.com`
- **Senha:** `admin123`
- **Perfis (Roles):** `["ADMIN"]`

### 2.2. Perfis de Usuário e Matriz RBAC Multi-Perfil

Os perfis existentes definidos no enum `Perfil` são:
1. `ADMIN`
2. `ESTOQUISTA`
3. `ATENDENTE`
4. `GESTOR`

Cada usuário possui um array `perfis: Perfil[]`. O acesso a uma rota protegida por `roleMiddleware` é concedido se o usuário possuir **qualquer um** dos perfis permitidos na rota:

| Módulo / Rota | `ADMIN` | `GESTOR` | `ESTOQUISTA` | `ATENDENTE` |
| :--- | :---: | :---: | :---: | :---: |
| `/usuarios` (todas as rotas) | ✅ | ❌ | ❌ | ❌ |
| `/pacientes` (todas as rotas) | ✅ | ✅ | ❌ | ✅ |
| `/medicos` (todas as rotas) | ✅ | ✅ | ❌ | ✅ |
| `/atendimentos` (todas as rotas) | ✅ | ✅ | ❌ | ✅ |
| `/insumos` (todas as rotas) | ✅ | ✅ | ✅ | ❌ |
| `/exame-insumos` (todas as rotas) | ✅ | ✅ | ✅ | ❌ |
| `/estoque/saldo`, `/estoque/resumo`, `/estoque/movimentacoes` (`GET`) | ✅ | ✅ | ✅ | ❌ |
| `/estoque/entrada`, `/estoque/saida`, `/estoque/ajuste` (`POST`) | ✅ | ❌ | ✅ | ❌ |
| `/exames`, `/exames/:id`, `/exames/:id/disponibilidade` (`GET`) | ✅ | ✅ | ✅ | ✅ |
| `/exames` (`POST`, `PUT`, `DELETE`) | ✅ | ✅ | ✅ | ❌ |
| `/relatorios/dashboard` (`GET`) | ✅ | ✅ | ✅ | ✅ |
| `/relatorios/movimentacoes-grafico` (`GET`) | ✅ | ✅ | ✅ | ❌ |

### 2.3. Contrato de Login

#### `POST /auth/login`
- **Autenticação:** Pública (não requer token).
- **Rate Limit:** 5 falhas/min por IP+e-mail, 20 falhas/min por IP e 10 falhas/15min por e-mail.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "email": "admin@clinica.com",
    "senha": "admin123"
  }
  ```
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "usuario": {
      "id": 1,
      "nome": "Administrador do Sistema",
      "email": "admin@clinica.com",
      "perfis": ["ADMIN"],
      "perfil": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: `{"error": "E-mail e senha são obrigatórios"}`
  - `400 Bad Request` / `401 Unauthorized`: `{"error": true, "message": "Credenciais inválidas ou usuário inativo"}`
  - `429 Too Many Requests`: `{"error": true, "message": "Muitas tentativas de login. Tente novamente mais tarde."}`

### 2.4. Formato e Envio do Token

- **Formato:** JSON Web Token (JWT) assinado com HMAC-SHA256 (`HS256`).
- **Validade:** 8 horas.
- **Payload decodificado:**
  ```json
  {
    "id": 1,
    "perfis": ["ADMIN"],
    "perfil": "ADMIN",
    "iat": 1791846481,
    "exp": 1791875281
  }
  ```
- **Header de Requisição Obrigatório para Rotas Protegidas:**
  ```http
  Authorization: Bearer <seu_token_jwt>
  ```
- **Erros de Autenticação e Autorização:**
  - `401 Unauthorized`: `{"error": "Token não fornecido"}`
  - `401 Unauthorized`: `{"error": "Erro de Token"}`
  - `401 Unauthorized`: `{"error": "Token mal formatado"}`
  - `401 Unauthorized`: `{"error": "Token inválido"}`
  - `403 Forbidden`: `{"error": "Acesso negado: perfil sem permissão"}`

---

## 3. Endpoints da Aplicação

### 3.1. Infraestrutura & Saúde

#### `GET /health` (ou `GET /api/health`)
- **Auth:** Pública
- **Resposta (`200 OK`):**
  ```json
  {
    "status": "ok",
    "database": "connected"
  }
  ```

---

### 3.2. Pacientes (`/pacientes`)
> Requer `Authorization: Bearer <token>`. Perfis permitidos: `ADMIN`, `GESTOR`, `ATENDENTE`.

#### `POST /pacientes`
- **Descrição:** Cadastra um novo paciente.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Maria de Souza",
    "cpf": "12345678901",
    "dataNascimento": "1985-05-20T00:00:00.000Z",
    "contato": "(11) 98765-4321"
  }
  ```
  - `nome`: string (mínimo 3 caracteres, obrigatório)
  - `cpf`: string (exatamente 11 dígitos numéricos, obrigatório, único)
  - `dataNascimento`: string ISO 8601 ou data (opcional)
  - `contato`: string (opcional)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Maria de Souza",
    "cpf": "12345678901",
    "dataNascimento": "1985-05-20T00:00:00.000Z",
    "contato": "(11) 98765-4321",
    "ativo": true,
    "createdAt": "2026-10-12T20:00:00.000Z"
  }
  ```

#### `GET /pacientes`
- **Descrição:** Lista pacientes ativos ordenados alfabeticamente por `nome ASC`.
- **Query Parameters (Opcionais — Transição Retrocompatível Passo 1):**
  - `page` (inteiro `>= 1`, default: `1` quando envelope ativo)
  - `limit` (inteiro entre `1` e `100`, default: `10` quando envelope ativo)
  - `search` (string, busca parcial *case-insensitive* por `nome` ou `cpf`, ignorando máscara/pontuação quando houver dígitos)
  - Valores de `page` `< 1` ou `limit` fora de `1..100` retornam `400 Bad Request`.
- **Regra de Resposta (`200 OK`):**
  - **Com `page`, `limit` ou `search` na query string:** retorna o envelope paginado `{ items, total, page, limit, totalPages }`.
  - **Sem nenhum dos três parâmetros:** mantém temporariamente o array legado `Paciente[]` para compatibilidade com seletores ainda não migrados.
- **Exemplo de Resposta Paginada (`GET /pacientes?page=1&limit=10&search=Maria`):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "nome": "Maria de Souza",
        "cpf": "12345678901",
        "dataNascimento": "1985-05-20T00:00:00.000Z",
        "contato": "(11) 98765-4321",
        "ativo": true,
        "createdAt": "2026-10-12T20:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
  ```

#### `GET /pacientes/:id`
- **Descrição:** Busca paciente por ID.
- **Resposta (`200 OK`):** Objeto `Paciente`
- **Resposta (`404 Not Found`):** `{"message": "Paciente não encontrado"}`

#### `PUT /pacientes/:id`
- **Descrição:** Atualiza dados do paciente.
- **Corpo da Requisição (JSON):** Qualquer subconjunto dos campos de criação (`nome`, `cpf`, `dataNascimento`, `contato`).
- **Resposta (`200 OK`):** Objeto `Paciente` atualizado.

#### `DELETE /pacientes/:id`
- **Descrição:** Desativa o paciente (soft delete, define `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.3. Insumos (`/insumos`)
> Requer `Authorization: Bearer <token>`. Perfis permitidos: `ADMIN`, `GESTOR`, `ESTOQUISTA`.

#### `POST /insumos`
- **Descrição:** Cadastra um novo insumo.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Agulha Descartável 25x7",
    "sku": "INS-AGU-25X7",
    "unidade": "CX",
    "categoria": "Descartáveis",
    "fabricante": "BD",
    "quantidadeMinima": 100
  }
  ```
  - `nome`: string (mínimo 3 caracteres, obrigatório, único)
  - `unidade`: enum `UnidadeMedida` (**obrigatório** na criação; valores aceitos: `"UN"`, `"CX"`, `"AMPOLA"`, `"FRASCO"`, `"ML"`, `"PAR"`, `"PACOTE"`, `"ROLO"`, `"KIT"`. O valor de transição `"NAO_INFORMADA"` ou ausência do campo retorna `400 Bad Request`)
  - `sku`: string (opcional, único se informado)
  - `categoria`: string (opcional)
  - `fabricante`: string (opcional)
  - `quantidadeMinima`: inteiro >= 0 (opcional, default: `0`)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Agulha Descartável 25x7",
    "sku": "INS-AGU-25X7",
    "unidade": "CX",
    "categoria": "Descartáveis",
    "fabricante": "BD",
    "quantidadeMinima": 100,
    "ativo": true,
    "createdAt": "2026-10-12T20:00:00.000Z"
  }
  ```

#### `GET /insumos`
- **Descrição:** Lista insumos com paginação e filtros por nome e status de ativação.
- **Query Parameters:**
  - `page` (number, opcional, default: `1`)
  - `limit` (number, opcional, default: `10`)
  - `nome` (string, opcional, busca parcial case-insensitive)
  - `ativo` (`"true"` | `"false"` | `"all"`, opcional, default: `"true"`). Qualquer valor fora de `true`, `false` ou `all` retorna `400 Bad Request`.
- **Resposta (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "nome": "Agulha Descartável 25x7",
        "sku": "INS-AGU-25X7",
        "unidade": "CX",
        "categoria": "Descartáveis",
        "fabricante": "BD",
        "quantidadeMinima": 100,
        "ativo": true,
        "createdAt": "2026-10-12T20:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
  ```

#### `GET /insumos/:id`
- **Descrição:** Busca insumo por ID (inclui `unidade`).
- **Resposta (`200 OK`):** Objeto `Insumo` ou `null` se não existir.

#### `PUT /insumos/:id`
- **Descrição:** Atualiza dados do insumo (`unidade` é opcional na atualização; se enviada, deve ser um valor de negócio válido do enum `UnidadeMedida`; `ativo` booleano opcional permite reativar/inativar).
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Agulha Descartável 25x7 alterada",
    "unidade": "UN",
    "quantidadeMinima": 150,
    "ativo": true
  }
  ```
- **Resposta (`200 OK`):** Objeto `Insumo` atualizado.

#### `DELETE /insumos/:id`
- **Descrição:** Desativa o insumo (soft delete, define `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.4. Exames (`/exames`)
> Requer `Authorization: Bearer <token>`. Leitura e disponibilidade permitidas para `ADMIN`, `GESTOR`, `ESTOQUISTA`, `ATENDENTE`; escrita (`POST`, `PUT`, `DELETE`) restrita a `ADMIN`, `GESTOR`, `ESTOQUISTA`.

#### `POST /exames`
- **Descrição:** Cadastra um novo exame laboratorial/clínico.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Hemograma Completo",
    "descricao": "Contagem de células sanguíneas",
    "codigo": "EX-0001",
    "departamento": "Hematologia"
  }
  ```
  - `nome`: string (obrigatório, único)
  - `descricao`: string (opcional)
  - `codigo`: string (opcional, único se informado)
  - `departamento`: string (opcional)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Hemograma Completo",
    "descricao": "Contagem de células sanguíneas",
    "codigo": "EX-0001",
    "departamento": "Hematologia",
    "ativo": true,
    "createdAt": "2026-10-12T20:00:00.000Z",
    "insumos": []
  }
  ```

#### `GET /exames`
- **Descrição:** Lista todos os exames ativos ordenados por `nome ASC`, incluindo os vínculos `insumos` (`ExameInsumo[]` com `insumo`).
- **Paginação / Filtros:** Sem paginação (retorna array de todos os ativos).
- **Resposta (`200 OK`):** `Exame[]`

#### `GET /exames/:id`
- **Descrição:** Busca exame por ID (inclui `insumos` com `insumo`).
- **Resposta (`200 OK`):** Objeto `Exame` ou `null`.

#### `GET /exames/:id/disponibilidade`
- **Descrição:** Verifica se há saldo em estoque suficiente para realizar o exame e classifica o nível pós-consumo de cada insumo (`CONFORME`, `ATENCAO`, `CRITICO` ou `INSUFICIENTE`).
- **Resposta (`200 OK`):**
  ```json
  {
    "exameId": 1,
    "nome": "Hemograma Completo",
    "codigo": "EX-0001",
    "disponivelParaAtendimento": true,
    "itens": [
      {
        "insumoId": 1,
        "nome": "Agulha Descartável 25x7",
        "unidade": "CX",
        "quantidadeNecessaria": 1,
        "disponivel": true,
        "nivel": "CONFORME"
      }
    ]
  }
  ```

#### `PUT /exames/:id`
- **Descrição:** Atualiza exame.
- **Corpo da Requisição (JSON):** `{ "nome"?: string, "descricao"?: string, "codigo"?: string, "departamento"?: string, "ativo"?: boolean }`
- **Resposta (`200 OK`):** Objeto `Exame` atualizado.

#### `DELETE /exames/:id`
- **Descrição:** Desativa o exame (soft delete, `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.5. Vínculo Exame-Insumos (`/exame-insumos`)
> Associa os insumos e quantidades consumidas por cada exame realizado.
> Requer `Authorization: Bearer <token>`. Perfis permitidos: `ADMIN`, `GESTOR`, `ESTOQUISTA`.

#### `POST /exame-insumos`
- **Descrição:** Associa um insumo e quantidade necessária a um exame.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "exameId": 1,
    "insumoId": 2,
    "quantidade": 1
  }
  ```
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "exameId": 1,
    "insumoId": 2,
    "quantidade": 1
  }
  ```

#### `GET /exame-insumos`
- **Descrição:** Lista todas as associações existentes com os objetos aninhados `exame` e `insumo` (incluindo `insumo.unidade`).
- **Resposta (`200 OK`):** `ExameInsumo[]`

#### `GET /exame-insumos/exame/:exameId`
- **Descrição:** Lista todos os insumos necessários para o exame especificado (com objeto `insumo` aninhado, incluindo `insumo.unidade`).
- **Resposta (`200 OK`):** `ExameInsumo[]`

#### `PUT /exame-insumos/:id`
- **Descrição:** Atualiza a quantidade do insumo para a associação.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "quantidade": 3
  }
  ```
- **Resposta (`200 OK`):** Objeto `ExameInsumo` atualizado.

#### `DELETE /exame-insumos/:id`
- **Descrição:** Remove a associação (hard delete).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.6. Médicos (`/medicos`)
> Requer `Authorization: Bearer <token>`. Perfis permitidos: `ADMIN`, `GESTOR`, `ATENDENTE`.

#### `POST /medicos`
- **Descrição:** Cadastra um novo médico.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Dr. Fernando Rocha",
    "crm": "123456/SP",
    "especialidade": "Cardiologia"
  }
  ```
  - `nome`: string (mínimo 3 caracteres, obrigatório)
  - `crm`: string (opcional, único se informado)
  - `especialidade`: string | null (opcional; aplica `trim`, aceita de 2 a 80 caracteres quando informado e converte `""` para `null`)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Dr. Fernando Rocha",
    "crm": "123456/SP",
    "especialidade": "Cardiologia",
    "ativo": true
  }
  ```

#### `GET /medicos`
- **Descrição:** Lista médicos ativos ordenados alfabeticamente por `nome ASC` (incluindo `"especialidade": string | null`).
- **Query Parameters (Opcionais — Transição Retrocompatível Passo 1):**
  - `page` (inteiro `>= 1`, default: `1` quando envelope ativo)
  - `limit` (inteiro entre `1` e `100`, default: `10` quando envelope ativo)
  - `search` (string, busca parcial *case-insensitive* por `nome`, `crm` ou `especialidade`)
  - Valores de `page` `< 1` ou `limit` fora de `1..100` retornam `400 Bad Request`.
- **Regra de Resposta (`200 OK`):**
  - **Com `page`, `limit` ou `search` na query string:** retorna `{ items, total, page, limit, totalPages }`.
  - **Sem nenhum dos três parâmetros:** mantém temporariamente o array legado `Medico[]`.

#### `GET /medicos/:id`
- **Descrição:** Busca médico por ID (inclui `"especialidade": string | null`).
- **Resposta (`200 OK`):** Objeto `Medico` ou `404 Not Found` `{"message": "Médico não encontrado"}`.

#### `PUT /medicos/:id`
- **Descrição:** Atualiza dados do médico.
- **Corpo da Requisição (JSON):** `{ "nome"?: string, "crm"?: string, "especialidade"?: string | null }` (aplica `trim`, valida entre 2 e 80 caracteres e converte `""` em `null`).
- **Resposta (`200 OK`):** Objeto `Medico` atualizado.

#### `DELETE /medicos/:id`
- **Descrição:** Desativa o médico (soft delete, `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.7. Estoque e Movimentações (`/estoque`)
> Requer `Authorization: Bearer <token>`. Consultas (`GET`) permitidas para `ADMIN`, `ESTOQUISTA`, `GESTOR`; operações de escrita (`POST`) restritas a `ADMIN` e `ESTOQUISTA`.

#### `POST /estoque/entrada`
- **Descrição:** Registra uma entrada manual de itens no estoque. O `usuarioId` é atribuído automaticamente pelo token JWT.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "insumoId": 1,
    "quantidade": 50,
    "motivo": "Compra mensal - NF 4589"
  }
  ```
  - `insumoId`: inteiro positivo (obrigatório)
  - `quantidade`: inteiro > 0 (obrigatório)
  - `motivo`: string (opcional)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "tipo": "ENTRADA",
    "quantidade": 50,
    "motivo": "Compra mensal - NF 4589",
    "insumoId": 1,
    "usuarioId": 1,
    "createdAt": "2026-10-12T20:00:00.000Z"
  }
  ```

#### `POST /estoque/saida`
- **Descrição:** Registra uma saída manual de itens. O backend valida se há saldo suficiente antes de gravar. Se insuficiente, rejeita a operação com erro.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "insumoId": 1,
    "quantidade": 10,
    "motivo": "Descarte por validade"
  }
  ```
- **Resposta (`201 Created`):** Objeto `MovimentacaoEstoque` (com `tipo: "SAIDA"`).
- **Erro de Saldo Insuficiente (`400 Bad Request`):**
  ```json
  {
    "error": true,
    "message": "Estoque insuficiente para esta operação"
  }
  ```

#### `POST /estoque/ajuste`
- **Descrição:** Registra um ajuste manual de inventário. A `quantidade` pode ser positiva (sobra identificada) ou negativa (perda/diferença de inventário).
- **Corpo da Requisição (JSON):**
  ```json
  {
    "insumoId": 1,
    "quantidade": -2,
    "motivo": "Ajuste após contagem física"
  }
  ```
  - `motivo`: string (opcional, default: `"Ajuste manual de estoque"`)
- **Resposta (`201 Created`):** Objeto `MovimentacaoEstoque` (com `tipo: "AJUSTE"`).

#### `GET /estoque/saldo`
- **Descrição:** Retorna a posição de estoque calculada para cada insumo ativo, indicando a unidade de medida (`unidade`) e se atingiu nível crítico (`alerta`).
- **Paginação / Filtros:** Retorna a lista completa de insumos ativos.
- **Resposta (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "nome": "Agulha Descartável 25x7",
      "sku": "INS-AGU-25X7",
      "unidade": "CX",
      "categoria": "Descartáveis",
      "fabricante": "BD",
      "saldo": 38,
      "quantidadeMinima": 100,
      "alerta": true
    },
    {
      "id": 2,
      "nome": "Luvas de Procedimento M",
      "sku": "INS-LUV-M",
      "unidade": "CX",
      "categoria": "EPI",
      "fabricante": null,
      "saldo": 450,
      "quantidadeMinima": 200,
      "alerta": false
    }
  ]
  ```

#### `GET /estoque/resumo`
- **Descrição:** Retorna indicadores consolidados de inventário e movimentações no período.
- **Query Parameters (Opcionais):**
  - `de` ou `startDate` (string ISO datetime)
  - `ate` ou `endDate` (string ISO datetime)
- **Resposta (`200 OK`):**
  ```json
  {
    "itensAtivos": 12,
    "abaixoDoMinimo": 2,
    "entradasPeriodo": {
      "registros": 5,
      "quantidadeTotal": 320
    },
    "saidasPeriodo": {
      "registros": 18,
      "quantidadeTotal": 74
    },
    "ajustesPeriodo": 1
  }
  ```

#### `GET /estoque/movimentacoes`
- **Descrição:** Histórico de movimentações de estoque paginado com dados do insumo, usuário responsável e atendimento vinculado (quando aplicável).
- **Query Parameters:**
  - `page` (number, opcional, default: `1`)
  - `limit` (number, opcional, default: `20`)
  - `insumoId` (number, opcional)
  - `tipo` (string, opcional: `"ENTRADA"` | `"SAIDA"` | `"AJUSTE"`)
  - `startDate` (string ISO datetime, opcional)
  - `endDate` (string ISO datetime, opcional)
- **Resposta (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "tipo": "ENTRADA",
        "motivo": "Compra mensal - NF 4589",
        "quantidade": 50,
        "insumoId": 1,
        "usuarioId": 1,
        "atendimentoId": null,
        "createdAt": "2026-10-12T20:00:00.000Z",
        "insumo": {
          "id": 1,
          "nome": "Agulha Descartável 25x7",
          "sku": "INS-AGU-25X7",
          "unidade": "CX",
          "categoria": "Descartáveis",
          "fabricante": "BD",
          "quantidadeMinima": 100,
          "ativo": true,
          "createdAt": "2026-10-12T20:00:00.000Z"
        },
        "usuario": {
          "nome": "Administrador do Sistema",
          "email": "admin@clinica.com"
        },
        "atendimento": null
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

---

### 3.8. Atendimentos (`/atendimentos`)
> Requer `Authorization: Bearer <token>`. Perfis permitidos: `ADMIN`, `GESTOR`, `ATENDENTE`.

#### `POST /atendimentos`
- **Descrição:** Abre um novo atendimento médico/laboratorial. É inicializado no status `EM_ATENDIMENTO`.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "pacienteId": 1,
    "medicoId": 1,
    "exameId": 1,
    "observacoes": "Paciente em jejum de 12h"
  }
  ```
  - `pacienteId`, `medicoId`, `exameId`: inteiros positivos e obrigatórios.
  - `observacoes`: string (opcional).
- **Resposta (`201 Created`):** Objeto `Atendimento` criado com objetos `paciente`, `medico` e `exame` aninhados.

#### `GET /atendimentos`
- **Descrição:** Lista atendimentos paginados com filtros avançados e dados de paciente, médico (incluindo `especialidade`), exame (com `insumos`) e movimentações.
- **Query Parameters:**
  - `page` (number, opcional, default: `1`)
  - `limit` (number, opcional, default: `10`)
  - `status` (string, opcional: `"EM_ATENDIMENTO"` | `"FINALIZADO"` | `"CANCELADO"`)
  - `startDate` (string ISO datetime, opcional, filtra por `criadoEm >= startDate`)
  - `endDate` (string ISO datetime, opcional, filtra por `criadoEm <= endDate`)
  - `medicoId` (number, opcional)
  - `pacienteId` (number, opcional)
- **Resposta (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "pacienteId": 1,
        "medicoId": 1,
        "exameId": 1,
        "status": "EM_ATENDIMENTO",
        "observacoes": "Paciente em jejum de 12h",
        "finalizadoEm": null,
        "canceladoEm": null,
        "motivoCancelamento": null,
        "criadoEm": "2026-10-12T20:00:00.000Z",
        "paciente": {
          "id": 1,
          "nome": "Maria de Souza",
          "cpf": "12345678901",
          "dataNascimento": "1985-05-20T00:00:00.000Z",
          "contato": "(11) 98765-4321",
          "ativo": true,
          "createdAt": "2026-10-12T20:00:00.000Z"
        },
        "medico": {
          "id": 1,
          "nome": "Dr. Fernando Rocha",
          "crm": "123456/SP",
          "especialidade": "Cardiologia",
          "ativo": true
        },
        "exame": {
          "id": 1,
          "nome": "Hemograma Completo",
          "descricao": "Contagem de células sanguíneas",
          "codigo": "EX-0001",
          "departamento": "Hematologia",
          "ativo": true,
          "createdAt": "2026-10-12T20:00:00.000Z",
          "insumos": []
        },
        "movimentacoes": []
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
  ```

#### `GET /atendimentos/resumo`
- **Descrição:** Retorna resumo operacional dos atendimentos e consumo de insumos na data de referência.
- **Query Parameters:**
  - `data` (string ISO date, opcional, default: data atual)
- **Resposta (`200 OK`):**
  ```json
  {
    "dataReferencia": "2026-10-17",
    "totalDia": 15,
    "emAtendimento": 3,
    "finalizadosHoje": 10,
    "canceladosHoje": 2,
    "taxaCancelamento": 13.3,
    "insumosConsumidosHoje": 28
  }
  ```

#### `GET /atendimentos/:id`
- **Descrição:** Busca atendimento por ID com detalhes de paciente, médico (incluindo `especialidade`), exame e movimentações.
- **Resposta (`200 OK`):** Objeto `Atendimento` ou `null`.

#### `PATCH /atendimentos/:id/finalizar`
- **Descrição:** Finaliza o atendimento e realiza a **baixa automática no estoque** em transação atômica (`Serializable`).
  1. Valida se o atendimento está `EM_ATENDIMENTO`.
  2. Valida se há saldo para todos os insumos vinculados ao exame do atendimento.
  3. Registra movimentações de `SAIDA` vinculadas ao `atendimentoId` e `usuarioId` com motivo `"Baixa automática pelo Atendimento #<id>"`.
  4. Atualiza o status para `FINALIZADO` e preenche `finalizadoEm`.
- **Corpo da Requisição:** Vazio.
- **Resposta (`200 OK`):** Objeto `Atendimento` finalizado.
- **Respostas de Erro:**
  - `400 Bad Request`: `{"error": true, "message": "Não é possível finalizar um atendimento que está FINALIZADO"}`
  - `400 Bad Request`: `{"error": true, "message": "Estoque insuficiente para o insumo \"<nome>\" (ID 2). Necessário: 3, Saldo: 1"}`

#### `PATCH /atendimentos/:id/cancelar`
- **Descrição:** Cancela o atendimento (apenas permitido se estiver no status `EM_ATENDIMENTO`), preenchendo `canceladoEm` e opcionalmente `motivoCancelamento`. Não afeta o estoque.
- **Corpo da Requisição (JSON, opcional):** `{ "motivo"?: string, "motivoCancelamento"?: string }`
- **Resposta (`200 OK`):** Objeto `Atendimento` com `status: "CANCELADO"`.
- **Resposta de Erro (`400 Bad Request`):** `{"error": true, "message": "Não é possível cancelar um atendimento que está FINALIZADO"}`

---

### 3.9. Relatórios & Dashboard (`/relatorios`)
> Requer `Authorization: Bearer <token>`.

#### `GET /relatorios/dashboard`
- **Descrição:** Dados consolidados para o painel principal da clínica, incluindo o nome do exame em `examesMaisRealizados` e os contadores agregados por status e do dia atual no fuso `America/Sao_Paulo`.
- **Perfis Permitidos (RBAC):** `ADMIN`, `GESTOR`, `ESTOQUISTA`, `ATENDENTE`.
- **Resposta (`200 OK`):**
  ```json
  {
    "totalAtendimentos": 42,
    "estoqueCritico": 2,
    "examesMaisRealizados": [
      {
        "exameId": 1,
        "nome": "Hemograma Completo",
        "_count": {
          "id": 15
        }
      },
      {
        "exameId": 3,
        "nome": "Glicemia em Jejum",
        "_count": {
          "id": 8
        }
      }
    ],
    "atendimentosPorStatus": {
      "emAtendimento": 5,
      "finalizados": 34,
      "cancelados": 3,
      "finalizadosHoje": 12,
      "protocolosDistintosHoje": 4
    }
  }
  ```

#### `GET /relatorios/movimentacoes-grafico`
- **Descrição:** Retorna a série histórica diária agregada de movimentações de estoque (`ENTRADA`, `SAIDA` e `AJUSTE`) nos últimos `dias` dias contínuos no fuso fixo `America/Sao_Paulo` (com *zero-filling* nos dias sem movimentação).
- **Perfis Permitidos (RBAC):** `ADMIN`, `ESTOQUISTA`, `GESTOR` (`ATENDENTE` recebe `403 Forbidden`).
- **Query Parameters:**
  - `dias` (inteiro opcional entre `1` e `90`, default: `7`). Valores fora do intervalo `[1, 90]` ou não inteiros retornam `400 Bad Request`.
- **Resposta (`200 OK`):**
  ```json
  [
    {
      "data": "2026-10-11",
      "entradasQtd": 120,
      "saidasQtd": 45,
      "ajustesLiquidoQtd": 0,
      "totalOperacoes": 6
    },
    {
      "data": "2026-10-12",
      "entradasQtd": 0,
      "saidasQtd": 0,
      "ajustesLiquidoQtd": -2,
      "totalOperacoes": 1
    }
  ]
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: Parâmetro `dias` inválido (fora de `1..90` ou não inteiro).
  - `403 Forbidden`: `{"error": "Acesso negado: perfil sem permissão"}` (ex.: perfil `ATENDENTE`).

---

### 3.10. Usuários (`/usuarios`)
> Requer `Authorization: Bearer <token>`. Exclusivo para o perfil `ADMIN` (demais perfis recebem `403 Forbidden`). A senha nunca é retornada nas respostas.

#### `POST /usuarios`
- **Descrição:** Cria um novo usuário no sistema com suporte a múltiplos perfis.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Carlos Estoquista",
    "email": "carlos@clinica.com",
    "senha": "senhaSegura123",
    "perfis": ["ESTOQUISTA", "ATENDENTE"]
  }
  ```
  - `nome`: string (mínimo 3 caracteres, obrigatório)
  - `email`: string (e-mail válido, obrigatório, único)
  - `senha`: string (mínimo 6 caracteres, obrigatório)
  - `perfis`: array não vazio de `Perfil` (`"ADMIN"` | `"ESTOQUISTA"` | `"ATENDENTE"` | `"GESTOR"`, default: `["ATENDENTE"]`; também aceita `perfil` singular por retrocompatibilidade)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 2,
    "nome": "Carlos Estoquista",
    "email": "carlos@clinica.com",
    "perfis": ["ESTOQUISTA", "ATENDENTE"],
    "ativo": true,
    "createdAt": "2026-10-16T02:00:00.000Z"
  }
  ```

#### `GET /usuarios`
- **Descrição:** Lista todos os usuários ativos ordenados por `nome ASC`.
- **Resposta (`200 OK`):** `Usuario[]` (sem o campo `senha`).

#### `GET /usuarios/:id`
- **Descrição:** Busca usuário por ID.
- **Resposta (`200 OK`):** Objeto `Usuario` ou `404 Not Found` `{"message": "Usuário não encontrado"}`.

#### `PUT /usuarios/:id`
- **Descrição:** Atualiza dados cadastrais, senha, status `ativo` ou `perfis` de um usuário.
- **Corpo da Requisição (JSON):** `{ "nome"?: string, "email"?: string, "senha"?: string, "perfis"?: Perfil[], "ativo"?: boolean }`
- **Resposta (`200 OK`):** Objeto `Usuario` atualizado.

#### `PATCH /usuarios/:id/perfis`
- **Descrição:** Atualiza exclusivamente a lista de perfis (`perfis`) do usuário (remove duplicatas automaticamente).
- **Corpo da Requisição (JSON):**
  ```json
  {
    "perfis": ["GESTOR", "ESTOQUISTA"]
  }
  ```
- **Resposta (`200 OK`):** Objeto `Usuario` atualizado.

#### `DELETE /usuarios/:id`
- **Descrição:** Desativa o usuário (soft delete, `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

## 4. Notas de Integração, Transições Ativas e Recomendações para o Frontend

1. **Paginação em `/pacientes` e `/medicos` (Transição Retrocompatível — Passo 1 Ativo):**
   - Os módulos `/insumos`, `/estoque/movimentacoes` e `/atendimentos` retornam sempre o envelope `{ items, total, page, limit, totalPages }`.
   - Os módulos `/pacientes` e `/medicos` operam no **Passo 1 da transição**: retornam `{ items, total, page, limit, totalPages }` sempre que **qualquer um** entre `page`, `limit` (`1..100`) ou `search` é enviado na query string, e mantêm o array legado (`Paciente[]` / `Medico[]`) quando chamados sem parâmetros.
   - Assim que o frontend concluir a migração dos seletores de `Atendimentos.tsx` e das tabelas de `Pacientes.tsx` / `Medicos.tsx` (Passo 2), o envelope paginado poderá tornar-se o padrão mesmo sem parâmetros (Passo 3).

2. **Unidade de Medida em Insumos (`UnidadeMedida`) e Ordem de Deploy:**
   - O campo `unidade` no modelo `Insumo` utiliza o enum `UnidadeMedida` (`UN`, `CX`, `AMPOLA`, `FRASCO`, `ML`, `PAR`, `PACOTE`, `ROLO`, `KIT`, `NAO_INFORMADA`).
   - **Atenção no Deploy:** `POST /insumos` exige o envio de uma unidade de negócio válida (rejeitando ausência ou `NAO_INFORMADA` com `400 Bad Request`), enquanto `PUT /insumos/:id` mantém `unidade` opcional. O frontend deve enviar `unidade` no formulário de criação de insumos.
   - Para insumos legados migrados como `NAO_INFORMADA`, o frontend deve exibir `"—"` com tooltip `"Unidade não cadastrada"`, sem inferir `"un"` como fallback.

3. **Filtro de Status em Insumos (`GET /insumos?ativo=`):**
   - `GET /insumos` aceita `?ativo=true|false|all` (default `"true"`) em conjunto com `page`, `limit` e `nome`, permitindo ao frontend popular as abas `"Ativos"`, `"Inativos"` e `"Todos"`.

4. **Especialidade Médica (`Medico.especialidade`):**
   - `POST /medicos`, `PUT /medicos/:id`, `GET /medicos`, `GET /medicos/:id` e o objeto `medico` aninhado em `GET /atendimentos` e `GET /atendimentos/:id` incluem `"especialidade": string | null` (com `trim`, 2 a 80 caracteres e conversão de `""` para `null`).

5. **Dashboard Enriquecido e Gráfico Temporal de Movimentações (`/relatorios`):**
   - `GET /relatorios/dashboard` inclui `nome` em cada item de `examesMaisRealizados` e o objeto `atendimentosPorStatus` (`emAtendimento`, `finalizados`, `cancelados`, `finalizadosHoje`, `protocolosDistintosHoje` calculados no fuso `America/Sao_Paulo` sem limite de 100 registros).
   - `GET /relatorios/movimentacoes-grafico?dias=7` fornece a série temporal diária (`1..90` dias, *zero-filling* em `America/Sao_Paulo`) com `entradasQtd`, `saidasQtd`, `ajustesLiquidoQtd` e `totalOperacoes` para os perfis `ADMIN`, `ESTOQUISTA` e `GESTOR`.

6. **Saldo Consolidado e Filtro de Críticos (`GET /estoque/saldo`):**
   - `GET /estoque/saldo` retorna a lista de todos os insumos ativos com `saldo`, `unidade`, `quantidadeMinima` e `alerta: boolean`. O filtro de itens críticos (`item.alerta === true`) permanece client-side ou via `GET /estoque/resumo`.
