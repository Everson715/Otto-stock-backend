# Contrato da API (API Contract) - Otto Stock Backend

Este documento formaliza a especificação de interface da API REST do backend da clínica (**Otto Stock**), detalhando todas as rotas, métodos HTTP, autenticação, controle de acesso, formatos de entrada e saída, parâmetros de paginação/filtro e lacunas conhecidas para consumo pelo Frontend.

---

## 1. Informações Gerais e Configuração

- **URL Base Direta:** `http://localhost:3000/api`
- **URL Base via Reverse Proxy (Nginx / Produção Local):** `http://localhost/api`
- **Documentação Interativa (Swagger UI):** `http://localhost:3000/api/docs` (ou `http://localhost/api/docs`)
- **Health Check:** `GET /api/health`
- **Formato dos Dados:** `application/json` (UTF-8)
- **CORS:** Habilitado para qualquer origem em ambiente de desenvolvimento (`*`), suportando requisições com header `Origin: http://localhost:5173`.
- **Rate Limiting:**
  - Geral: 600 requisições por janela de 15 minutos por usuário autenticado (ou IP se anônimo), configurável via `RATE_LIMIT_MAX` (mais folgado em desenvolvimento: 3000/15min).
  - Login (`POST /auth/login`): 5 tentativas por minuto por IP + e-mail.

---

## 2. Autenticação e Credenciais de Teste

### 2.1. Credenciais de Teste (Usuário Seed)

O banco de dados é inicializado automaticamente com o seguinte usuário administrador:
- **E-mail:** `admin@clinica.com`
- **Senha:** `admin123`
- **Perfil (Role):** `ADMIN`

### 2.2. Perfis de Usuário (Roles Disponíveis)

Os perfis existentes definidos no enum `Perfil` são:
1. `ADMIN`
2. `ESTOQUISTA`
3. `ATENDENTE`
4. `GESTOR`

### 2.3. Contrato de Login

#### `POST /auth/login`
- **Autenticação:** Pública (não requer token).
- **Rate Limit:** 5 requisições por minuto por IP + e-mail.
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
    "perfil": "ADMIN",
    "iat": 1791846481,
    "exp": 1791875281
  }
  ```
- **Header de Requisição Obrigatório para Rotas Protegidas:**
  ```http
  Authorization: Bearer <seu_token_jwt>
  ```
- **Erros de Autenticação:**
  - `401 Unauthorized`: `{"error": "Token não fornecido"}`
  - `401 Unauthorized`: `{"error": "Erro de Token"}`
  - `401 Unauthorized`: `{"error": "Token mal formatado"}`
  - `401 Unauthorized`: `{"error": "Token inválido"}`
  - `403 Forbidden`: `{"error": "Acesso negado: perfil sem permissão"}`

---

## 3. Endpoints da Aplicação

### 3.1. Infraestrutura & Saúde

#### `GET /health`
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
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

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
- **Descrição:** Retorna todos os pacientes ativos cadastrados ordenados alfabeticamente por nome.
- **Paginação / Filtros:** Sem paginação no momento (retorna lista completa).
- **Resposta (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "nome": "Maria de Souza",
      "cpf": "12345678901",
      "dataNascimento": "1985-05-20T00:00:00.000Z",
      "contato": "(11) 98765-4321",
      "ativo": true,
      "createdAt": "2026-10-12T20:00:00.000Z"
    }
  ]
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
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

#### `POST /insumos`
- **Descrição:** Cadastra um novo insumo.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Agulha Descartável 25x7",
    "quantidadeMinima": 100
  }
  ```
  - `nome`: string (mínimo 3 caracteres, obrigatório, único)
  - `quantidadeMinima`: inteiro >= 0 (opcional, default: `0`)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Agulha Descartável 25x7",
    "quantidadeMinima": 100,
    "ativo": true,
    "createdAt": "2026-10-12T20:00:00.000Z"
  }
  ```

#### `GET /insumos`
- **Descrição:** Lista insumos ativos com paginação e filtro por nome.
- **Query Parameters:**
  - `page` (number, opcional, default: `1`)
  - `limit` (number, opcional, default: `10`)
  - `nome` (string, opcional, busca parcial case-insensitive)
- **Resposta (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": 1,
        "nome": "Agulha Descartável 25x7",
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
- **Descrição:** Busca insumo por ID.
- **Resposta (`200 OK`):** Objeto `Insumo` ou `null` se não existir.

#### `PUT /insumos/:id`
- **Descrição:** Atualiza dados do insumo.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Agulha Descartável 25x7 alterada",
    "quantidadeMinima": 150
  }
  ```
- **Resposta (`200 OK`):** Objeto `Insumo` atualizado.

#### `DELETE /insumos/:id`
- **Descrição:** Desativa o insumo (soft delete, define `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.4. Exames (`/exames`)
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

#### `POST /exames`
- **Descrição:** Cadastra um novo exame laboratorial/clínico.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Hemograma Completo",
    "descricao": "Contagem de células sanguíneas"
  }
  ```
  - `nome`: string (obrigatório, único)
  - `descricao`: string (opcional)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Hemograma Completo",
    "descricao": "Contagem de células sanguíneas",
    "ativo": true,
    "createdAt": "2026-10-12T20:00:00.000Z"
  }
  ```

#### `GET /exames`
- **Descrição:** Lista todos os exames ativos.
- **Paginação / Filtros:** Sem paginação (retorna array de todos os ativos).
- **Resposta (`200 OK`):** `Exame[]`

#### `GET /exames/:id`
- **Descrição:** Busca exame por ID.
- **Resposta (`200 OK`):** Objeto `Exame` ou `null`.

#### `PUT /exames/:id`
- **Descrição:** Atualiza exame.
- **Corpo da Requisição (JSON):** `{ "nome"?: string, "descricao"?: string }`
- **Resposta (`200 OK`):** Objeto `Exame` atualizado.

#### `DELETE /exames/:id`
- **Descrição:** Desativa o exame (soft delete, `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.5. Vínculo Exame-Insumos (`/exame-insumos`)
> Associa os insumos e quantidades consumidas por cada exame realizado.
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

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
- **Descrição:** Lista todas as associações existentes com os objetos aninhados `exame` e `insumo`.
- **Resposta (`200 OK`):** `ExameInsumo[]`

#### `GET /exame-insumos/exame/:exameId`
- **Descrição:** Lista todos os insumos necessários para o exame especificado (com objeto `insumo` aninhado).
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
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

#### `POST /medicos`
- **Descrição:** Cadastra um novo médico.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "nome": "Dr. Fernando Rocha",
    "crm": "123456/SP"
  }
  ```
  - `nome`: string (mínimo 3 caracteres, obrigatório)
  - `crm`: string (opcional, único se informado)
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "nome": "Dr. Fernando Rocha",
    "crm": "123456/SP",
    "ativo": true
  }
  ```

#### `GET /medicos`
- **Descrição:** Lista todos os médicos ativos.
- **Paginação / Filtros:** Sem paginação (retorna array de todos os ativos).
- **Resposta (`200 OK`):** `Medico[]`

#### `GET /medicos/:id`
- **Descrição:** Busca médico por ID.
- **Resposta (`200 OK`):** Objeto `Medico` ou `404 Not Found` `{"message": "Médico não encontrado"}`.

#### `PUT /medicos/:id`
- **Descrição:** Atualiza dados do médico.
- **Corpo da Requisição (JSON):** `{ "nome"?: string, "crm"?: string }`
- **Resposta (`200 OK`):** Objeto `Medico` atualizado.

#### `DELETE /medicos/:id`
- **Descrição:** Desativa o médico (soft delete, `ativo = false`).
- **Resposta (`204 No Content`):** Corpo vazio.

---

### 3.7. Estoque e Movimentações (`/estoque`)
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

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
- **Descrição:** Retorna a posição de estoque calculada para cada insumo ativo, indicando se atingiu nível crítico (`alerta`).
- **Paginação / Filtros:** Retorna a lista completa de insumos ativos.
- **Resposta (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "nome": "Agulha Descartável 25x7",
      "saldo": 38,
      "quantidadeMinima": 100,
      "alerta": true
    },
    {
      "id": 2,
      "nome": "Luvas de Procedimento M",
      "saldo": 450,
      "quantidadeMinima": 200,
      "alerta": false
    }
  ]
  ```

#### `GET /estoque/movimentacoes`
- **Descrição:** Histórico de movimentações de estoque paginado com dados do insumo e usuário responsável.
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
        "createdAt": "2026-10-12T20:00:00.000Z",
        "insumo": {
          "id": 1,
          "nome": "Agulha Descartável 25x7",
          "quantidadeMinima": 100,
          "ativo": true,
          "createdAt": "2026-10-12T20:00:00.000Z"
        },
        "usuario": {
          "nome": "Administrador do Sistema",
          "email": "admin@clinica.com"
        }
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
> Todas as rotas abaixo requerem `Authorization: Bearer <token>`.

#### `POST /atendimentos`
- **Descrição:** Abre um novo atendimento médico/laboratorial. É inicializado no status `EM_ATENDIMENTO`.
- **Corpo da Requisição (JSON):**
  ```json
  {
    "pacienteId": 1,
    "medicoId": 1,
    "exameId": 1
  }
  ```
  - Todos os campos são inteiros positivos e obrigatórios.
- **Resposta (`201 Created`):**
  ```json
  {
    "id": 1,
    "pacienteId": 1,
    "medicoId": 1,
    "exameId": 1,
    "status": "EM_ATENDIMENTO",
    "criadoEm": "2026-10-12T20:00:00.000Z"
  }
  ```

#### `GET /atendimentos`
- **Descrição:** Lista atendimentos paginados com filtros avançados e dados de paciente, médico e exame inclusos.
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
          "ativo": true
        },
        "exame": {
          "id": 1,
          "nome": "Hemograma Completo",
          "descricao": "Contagem de células sanguíneas",
          "ativo": true,
          "createdAt": "2026-10-12T20:00:00.000Z"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
  ```

#### `GET /atendimentos/:id`
- **Descrição:** Busca atendimento por ID com detalhes de médico e exame.
- **Resposta (`200 OK`):** Objeto `Atendimento` ou `null`.

#### `PATCH /atendimentos/:id/finalizar`
- **Descrição:** Finaliza o atendimento e realiza a **baixa automática no estoque** em transação atômica (`prisma.$transaction`).
  1. Valida se o atendimento está `EM_ATENDIMENTO`.
  2. Valida se há saldo para todos os insumos vinculados ao exame do atendimento.
  3. Registra movimentações de `SAIDA` para cada insumo com motivo `"Baixa automática pelo Atendimento #<id>"`.
  4. Atualiza o status para `FINALIZADO`.
- **Corpo da Requisição:** Vazio.
- **Resposta (`200 OK`):**
  ```json
  {
    "id": 1,
    "pacienteId": 1,
    "medicoId": 1,
    "exameId": 1,
    "status": "FINALIZADO",
    "criadoEm": "2026-10-12T20:00:00.000Z"
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: `{"error": true, "message": "Não é possível finalizar um atendimento que está FINALIZADO"}`
  - `400 Bad Request`: `{"error": true, "message": "Estoque insuficiente para o insumo ID 2. Necessário: 3, Saldo: 1"}`

#### `PATCH /atendimentos/:id/cancelar`
- **Descrição:** Cancela o atendimento (apenas permitido se estiver no status `EM_ATENDIMENTO`). Não afeta o estoque.
- **Corpo da Requisição:** Vazio.
- **Resposta (`200 OK`):** Objeto `Atendimento` com `status: "CANCELADO"`.
- **Resposta de Erro (`400 Bad Request`):** `{"error": true, "message": "Não é possível cancelar um atendimento que está FINALIZADO"}`

---

### 3.9. Relatórios & Dashboard (`/relatorios`)
> Requer `Authorization: Bearer <token>`.

#### `GET /relatorios/dashboard`
- **Descrição:** Dados consolidados para o painel principal da clínica.
- **Resposta (`200 OK`):**
  ```json
  {
    "totalAtendimentos": 42,
    "estoqueCritico": 2,
    "examesMaisRealizados": [
      {
        "exameId": 1,
        "_count": {
          "id": 15
        }
      },
      {
        "exameId": 3,
        "_count": {
          "id": 8
        }
      }
    ]
  }
  ```

---

## 4. Lacunas Conhecidas e Recomendações para o Frontend

Abaixo estão listadas as divergências e ausências identificadas na API atual que o frontend precisará contornar ou prever em seu desenvolvimento (nenhuma delas foi alterada nesta etapa para preservar o escopo do contrato):

1. **Inconsistência de Paginação entre Módulos:**
   - Os módulos `/insumos`, `/estoque/movimentacoes` e `/atendimentos` implementam paginação padrão com o formato `{ items, total, page, limit, totalPages }`.
   - Já os módulos `/pacientes`, `/medicos`, `/exames` e `/exame-insumos` **não possuem paginação**, retornando diretamente um array JSON com todos os registros ativos. O frontend deve tratar essa diferença ao renderizar tabelas e listagens.

2. **Ausência de Endpoint de Saldo Consolidado Individual:**
   - A rota `GET /estoque/saldo` calcula e retorna em memória a lista de saldo de **todos** os insumos ativos de uma só vez.
   - Não existe atualmente um endpoint para consultar o saldo específico de um insumo individual (ex.: `GET /estoque/saldo/:insumoId`). O frontend deve filtrar o array retornado por `GET /estoque/saldo` ou utilizar o saldo exibido no payload geral.

3. **Campos no Modelo de Insumos (`Insumo`):**
   - **Nomenclatura do Estoque Mínimo:** O campo no banco e na API chama-se `quantidadeMinima` e não `estoqueMinimo`.
   - **Ausência de Unidade de Medida:** O modelo `Insumo` não possui o campo `unidade` (ex.: "un", "cx", "ml", "ampola"). Caso a UI precise exibir unidades, terá que definir um valor padrão ou mapeamento estático no frontend até que uma migration adicione essa coluna no backend.

4. **Filtros e Busca em Pacientes e Médicos:**
   - `GET /pacientes` e `GET /medicos` não aceitam query parameters de filtro por nome, CPF ou CRM. A filtragem de busca por texto na tela de pacientes/médicos precisa ser feita no cliente (client-side) após receber a lista completa.

5. **Payload de Exames Mais Realizados no Dashboard:**
   - No retorno de `GET /relatorios/dashboard`, o campo `examesMaisRealizados` retorna apenas o agrupamento bruto `{ exameId: number, _count: { id: number } }`, sem o nome ou descrição do exame. O frontend precisa fazer o cruzamento com a lista de exames obtida em `GET /exames` para exibir os nomes nos gráficos/cards.

6. **Filtro de Insumos Críticos:**
   - A rota `GET /estoque/saldo` não aceita query param `apenasCriticos=true`. O frontend deve aplicar um filtro no client-side verificando o atributo booleano `item.alerta === true`.

7. **Gestão de Usuários (RBAC / CRUD):**
   - Não existem rotas de listagem, cadastro ou alteração de usuários (`/usuarios`). Atualmente, apenas o login e o seed inicial estão implementados.
   - Embora o middleware `roleMiddleware` exista no código-fonte, as rotas protegidas atuais utilizam apenas a autenticação básica `authMiddleware`, permitindo que qualquer perfil autenticado acerte os endpoints protegidos.
