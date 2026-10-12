-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'ESTOQUISTA', 'ATENDENTE', 'GESTOR');

-- AlterEnum
ALTER TYPE "TipoMovimentacao" ADD VALUE 'AJUSTE';

-- AlterTable
ALTER TABLE "Atendimento" ADD COLUMN     "pacienteId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Exame" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Medico" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "usuarioId" INTEGER;

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'ATENDENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "contato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Atendimento_status_idx" ON "Atendimento"("status");

-- CreateIndex
CREATE INDEX "Atendimento_criadoEm_idx" ON "Atendimento"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Exame_nome_key" ON "Exame"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ExameInsumo_exameId_insumoId_key" ON "ExameInsumo"("exameId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_nome_key" ON "Insumo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Medico_crm_key" ON "Medico"("crm");

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
