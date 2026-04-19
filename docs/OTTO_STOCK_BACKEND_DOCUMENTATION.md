# Documentação Técnica: Otto-stock-backend

Esta documentação descreve a arquitetura, endpoints, modelos de dados e o estado atual do desenvolvimento do backend do sistema Otto Stock.

---

## 1. Arquitetura do Sistema

O sistema segue uma arquitetura baseada em **Camadas (Layered Architecture)**, utilizando o framework **Express** e o ORM **Prisma**.

### Fluxo de Dados
1.  **Client**: Envia requisições HTTP (JSON).
2.  **Routes**: Direciona a requisição para o controller correspondente (`src/routes.ts`).
3.  **Controller**: Extrai dados da requisição (body, params), chama o serviço e retorna a resposta HTTP (`src/modules/*/controller.ts`).
4.  **Service**: Contém a lógica de negócio e interage com o banco de dados via Prisma (`src/modules/*/service.ts`).
5.  **Database**: PostgreSQL gerenciado pelo Prisma.

---

## 2. Mapeamento de Endpoints

### 2.1 Insumos (`/insumos`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/` | Cria um novo insumo. |
| `GET` | `/` | Lista todos os insumos. |
| `GET` | `/:id` | Busca um insumo por ID. |
| `PUT` | `/:id` | Atualiza um insumo existente. |
| `DELETE` | `/:id` | Remove um insumo. |

**Exemplo de JSON (Criar Insumo):**
```json
{
  "nome": "Seringa 5ml",
  "quantidade": 100
}
```

### 2.2 Exames (`/exames`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/` | Cria um novo exame. |
| `GET` | `/` | Lista todos os exames. |
| `GET` | `/:id` | Busca um exame por ID. |
| `PUT` | `/:id` | Atualiza um exame existente. |
| `DELETE` | `/:id` | Remove um exame. |

**Exemplo de JSON (Criar Exame):**
```json
{
  "nome": "Hemograma",
  "descricao": "Exame de sangue completo",
  "quantidade": 1,
  "unidade": "un"
}
```

### 2.3 Estoque (`/estoque`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/entrada` | Registra entrada de insumo no estoque. |
| `POST` | `/saida` | Registra saída manual de insumo. |
| `GET` | `/movimentacoes` | Lista o histórico de movimentações. |

**Exemplo de JSON (Entrada):**
```json
{
  "insumoId": 1,
  "quantidade": 50
}
```

### 2.4 Atendimentos (`/atendimentos`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/` | Cria um novo atendimento. |
| `GET` | `/` | Lista todos os atendimentos. |
| `GET` | `/:id` | Busca atendimento por ID. |
| `PATCH` | `/:id/finalizar` | Finaliza atendimento e abate estoque. |
| `PATCH` | `/:id/cancelar` | Cancela atendimento. |

**Exemplo de JSON (Criar Atendimento):**
```json
{
  "medicoId": 1,
  "exameId": 1
}
```

---

## 3. Domínios de Negócio

### Entidades Principais
- **Medico**: Profissional responsável pelo atendimento.
- **Exame**: Procedimento realizado que consome insumos.
- **Insumo**: Itens de estoque (agulhas, luvas, reagentes).
- **MovimentacaoEstoque**: Registro de entradas e saídas.
- **Atendimento**: Vínculo entre médico, exame e paciente (em desenvolvimento).

### Regras de Negócio
1.  **Baixa Automática**: Ao finalizar um atendimento, o sistema percorre os insumos vinculados ao exame e gera automaticamente registros de `SAIDA` no estoque.
2.  **Status de Atendimento**: Um atendimento inicia como `EM_ATENDIMENTO` e pode transitar para `FINALIZADO` ou `CANCELADO`.

---

## 4. Integrações e Infraestrutura

### Banco de Dados
- **Motor**: PostgreSQL.
- **ORM**: Prisma.
- **Configuração (.env)**:
  ```env
  DATABASE_URL="postgresql://postgres:bearzatto@localhost:5432/otto_stock?schema=public"
  ```

### Middlewares
- `express.json()`: Para parsing de corpos JSON.
- **Segurança**: Atualmente não possui middlewares de autenticação (ex: JWT) ou CORS configurados no código principal.

---

## 5. Análise de Cobertura e Pendências

Com base na análise do código, foram identificadas as seguintes áreas incompletas ou que necessitam de melhorias:

### Funcionalidades Pendentes
- **CRUD de Médicos**: A entidade `Medico` existe no banco, mas não há rotas ou lógica implementada para gerenciá-los.
- **Vínculo Exame-Insumo**: Não há uma rota para definir quais insumos e em que quantidade cada exame consome (`ExameInsumo`). Atualmente, isso parece ser feito manualmente no banco.
- **Swagger**: As dependências estão instaladas, mas o Swagger não foi inicializado no `server.ts`.

### Validações e Segurança
- **Falta de Validação (Zod)**: Embora o Zod esteja instalado, os controllers não o utilizam para validar os dados de entrada, confiando apenas nas interfaces TypeScript (que não validam em runtime).
- **Autenticação**: Não há sistema de login ou proteção de rotas.
- **Tratamento de Erros**: Falta um middleware global para capturar erros e retornar respostas padronizadas.
- **Estoque Negativo**: O sistema permite saídas sem verificar se há saldo suficiente (risco de estoque negativo).

---

## 6. Dicionário de Dados (Tipos Técnicos)

### Insumo
```typescript
interface Insumo {
  id: number;
  nome: string;
  createdAt: Date;
}
```

### Atendimento
```typescript
interface Atendimento {
  id: number;
  medicoId: number;
  exameId: number;
  status: 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO';
  criadoEm: Date;
}
```

### MovimentacaoEstoque
```typescript
interface MovimentacaoEstoque {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  insumoId: number;
  createdAt: Date;
}
```
