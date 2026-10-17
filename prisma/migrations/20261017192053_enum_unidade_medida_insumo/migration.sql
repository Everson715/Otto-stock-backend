-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('UN', 'CX', 'AMPOLA', 'FRASCO', 'ML', 'PAR', 'PACOTE', 'ROLO', 'KIT', 'NAO_INFORMADA');

-- AlterTable: substitui a coluna textual antiga pela coluna tipada com enum,
-- preenchendo registros legados com 'NAO_INFORMADA' e removendo o default em seguida.
ALTER TABLE "Insumo" DROP COLUMN IF EXISTS "unidade";
ALTER TABLE "Insumo" ADD COLUMN "unidade" "UnidadeMedida" NOT NULL DEFAULT 'NAO_INFORMADA';
UPDATE "Insumo" SET "unidade" = 'NAO_INFORMADA' WHERE "unidade" IS NULL;
ALTER TABLE "Insumo" ALTER COLUMN "unidade" DROP DEFAULT;
