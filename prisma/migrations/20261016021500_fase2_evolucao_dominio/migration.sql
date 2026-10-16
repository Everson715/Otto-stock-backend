-- AlterTable Insumo
ALTER TABLE "Insumo"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'un',
  ADD COLUMN "categoria" TEXT,
  ADD COLUMN "fabricante" TEXT;

-- AlterTable Exame
ALTER TABLE "Exame"
  ADD COLUMN "codigo" TEXT,
  ADD COLUMN "departamento" TEXT;

-- Backfill codigo para exames existentes sem codigo
UPDATE "Exame"
SET "codigo" = 'EX-' || LPAD("id"::text, 4, '0')
WHERE "codigo" IS NULL;

-- AlterTable Atendimento
ALTER TABLE "Atendimento"
  ADD COLUMN "observacoes" TEXT,
  ADD COLUMN "finalizadoEm" TIMESTAMP(3),
  ADD COLUMN "canceladoEm" TIMESTAMP(3),
  ADD COLUMN "motivoCancelamento" TEXT;

-- AlterTable MovimentacaoEstoque
ALTER TABLE "MovimentacaoEstoque"
  ADD COLUMN "atendimentoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_sku_key" ON "Insumo"("sku");
CREATE UNIQUE INDEX "Exame_codigo_key" ON "Exame"("codigo");
CREATE INDEX "MovimentacaoEstoque_insumoId_idx" ON "MovimentacaoEstoque"("insumoId");
CREATE INDEX "MovimentacaoEstoque_createdAt_idx" ON "MovimentacaoEstoque"("createdAt");
CREATE INDEX "MovimentacaoEstoque_atendimentoId_idx" ON "MovimentacaoEstoque"("atendimentoId");

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque"
  ADD CONSTRAINT "MovimentacaoEstoque_atendimentoId_fkey"
  FOREIGN KEY ("atendimentoId") REFERENCES "Atendimento"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
