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
├── controllers
├── database
│   └── prisma.ts
│
├── modules
│   ├── atendimentos
│   │   ├── dto
│   │   ├── atendimento.controller.ts
│   │   ├── atendimento.service.ts
│   │   └── atendimento.routes.ts
│   │
│   ├── exames
│   │   ├── dto
│   │   ├── exames.controller.ts
│   │   ├── exames.service.ts
│   │   └── exames.routes.ts
│   │
│   ├── insumos
│   │   ├── dto
│   │   ├── insumos.controller.ts
│   │   ├── insumos.service.ts
│   │   └── insumos.routes.ts
│   │
│   └── estoque
│       ├── dto
│       ├── estoque.controller.ts
│       ├── estoque.service.ts
│       └── estoque.routes.ts
│
└── routes.ts
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
git clone https://github.com/seu-repositorio/otto-stock-api
```

Entre no projeto:

```
cd otto-stock-api
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

Criar insumo

```
POST /insumos
```

Listar insumos

```
GET /insumos
```

---

## Exames

Criar exame

```
POST /exames
```

Associar insumo a exame

```
POST /exames/insumos
```

---

## Estoque

Entrada de estoque

```
POST /estoque/entrada
```

Saída de estoque

```
POST /estoque/saida
```

Histórico de movimentações

```
GET /estoque/movimentacoes
```

---

## Atendimentos

Criar atendimento

```
POST /atendimentos
```

Listar atendimentos

```
GET /atendimentos
```

Buscar atendimento

```
GET /atendimentos/:id
```

Finalizar atendimento

```
PATCH /atendimentos/:id/finalizar
```

Cancelar atendimento

```
PATCH /atendimentos/:id/cancelar
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
