# Otto Stock API

Backend de demonstração para **gestão de insumos clínicos e execução de exames**, desenvolvido com **Node.js, Express, Prisma ORM e PostgreSQL**.

O objetivo do projeto é demonstrar uma arquitetura simples e organizada para sistemas que envolvem **controle de estoque, execução de procedimentos e consumo automático de insumos**.

---

# Visão Geral

O sistema permite:

* Cadastro de médicos
* Cadastro de exames
* Cadastro de insumos
* Associação de insumos a exames
* Registro de atendimentos
* Controle de movimentação de estoque
* Consumo automático de insumos ao finalizar um atendimento

Este backend simula o funcionamento básico de um **sistema de logística clínica**.

---

# Tecnologias Utilizadas

* Node.js
* Express
* Prisma ORM
* PostgreSQL
* TypeScript

---

# Estrutura do Projeto

```
src
│
├── database
│   └── prisma.ts
│
├── middlewares
│   └── error-handler.ts
│
├── modules
│   ├── atendimentos
│   │   ├── dto
│   │   ├── atendimento.controller.ts
│   │   ├── atendimento.service.ts
│   │   └── atendimento.routes.ts
│   │
│   ├── estoque
│   │   ├── dto
│   │   ├── estoque.controller.ts
│   │   ├── estoque.service.ts
│   │   └── estoque.routes.ts
│   │
│   ├── exame-insumo
│   │   ├── dto
│   │   ├── exame-insumo.controller.ts
│   │   ├── exame-insumo.service.ts
│   │   └── exame-insumo.routes.ts
│   │
│   ├── exames
│   │   ├── dto
│   │   ├── exame.controller.ts
│   │   ├── exame.service.ts
│   │   └── exame.routes.ts
│   │
│   ├── insumos
│   │   ├── dto
│   │   ├── insumo.controller.ts
│   │   ├── insumo.service.ts
│   │   └── insumo.routes.ts
│   │
│   ├── medicos
│   │   ├── dto
│   │   ├── medico.controller.ts
│   │   ├── medico.service.ts
│   │   └── medico.routes.ts
│   │
│   └── relatorios
│       ├── relatorio.controller.ts
│       ├── relatorio.service.ts
│       └── relatorio.routes.ts
│
├── routes.ts
└── server.ts
```

---

# Modelagem do Banco de Dados

Principais entidades do sistema:

* **Medico**
* **Exame**
* **Insumo**
* **Atendimento**
* **MovimentacaoEstoque**

Relacionamentos importantes:

* Um exame pode consumir vários insumos
* Um insumo pode ser utilizado em vários exames
* Um atendimento representa a execução de um exame
* Ao finalizar um atendimento os insumos são automaticamente debitados do estoque

---

# Fluxo de Funcionamento

### 1. Cadastro de insumos

Os insumos representam materiais utilizados nos exames.

Exemplo:

* seringa
* luva
* tubo de coleta

---

### 2. Cadastro de exames

Um exame pode utilizar vários insumos.

Exemplo:

Hemograma:

* 1 seringa
* 1 tubo
* 2 luvas

---

### 3. Entrada de estoque

Movimentação de entrada de insumos.

---

### 4. Criação de atendimento

Registro da execução de um exame por um médico.

---

### 5. Finalização do atendimento

Quando o atendimento é finalizado:

1. O sistema busca os insumos necessários para o exame
2. O sistema registra automaticamente as saídas de estoque
3. O atendimento é marcado como finalizado

---

# Instalação

Clone o repositório:

```
git clone https://github.com/Everson715/Otto-stock-backend.git
```

Entre no projeto:

```
cd otto-stock-backend
```

Instale as dependências:

```
npm install
```

---

# Configuração do Banco

Crie um arquivo `.env`:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/otto_stock"
```

---

# Executar Migrações

```
npx prisma migrate dev
```

Gerar cliente Prisma:

```
npx prisma generate
```

---

# Rodar o Servidor

```
npm run dev
```

Servidor iniciará em:

```
http://localhost:3000
```

---

# Endpoints Principais

## Insumos

```
POST /insumos
GET /insumos
GET /insumos/:id
PUT /insumos/:id
DELETE /insumos/:id
```

---

## Exames

```
POST /exames
GET /exames
GET /exames/:id
PUT /exames/:id
DELETE /exames/:id
```

---

## Exame-Insumos (Associação)

```
POST /exame-insumos
GET /exame-insumos
GET /exame-insumos/exame/:exameId
DELETE /exame-insumos/:id
```

---

## Estoque

```
POST /estoque/entrada
POST /estoque/saida
GET /estoque/movimentacoes
GET /estoque/saldo
```

---

## Atendimentos

```
POST /atendimentos
GET /atendimentos
GET /atendimentos/:id
PATCH /atendimentos/:id/finalizar
PATCH /atendimentos/:id/cancelar
```

---

## Médicos

```
POST /medicos
GET /medicos
GET /medicos/:id
PUT /medicos/:id
DELETE /medicos/:id
```

---

## Relatórios

```
GET /relatorios/dashboard
```

---

# Regras de Negócio

### Consumo automático de insumos

Ao finalizar um atendimento o sistema registra automaticamente a saída de insumos utilizados no exame.

### Histórico de estoque

Todas as movimentações de estoque são registradas para manter rastreabilidade.

---

# Objetivo do Projeto

Este projeto foi desenvolvido como **backend demonstrativo** para estudo de:

* arquitetura de APIs REST
* modelagem de banco relacional
* controle de estoque
* regras de negócio em sistemas clínicos

---

# Melhorias Futuras

Possíveis evoluções do projeto:

* autenticação de usuários
* multi clínica (multi-tenant)
* validação de dados
* documentação com Swagger
* dashboard administrativo
* controle de lote e validade de insumos

---

# Autor

Desenvolvido por **José Everson**.
