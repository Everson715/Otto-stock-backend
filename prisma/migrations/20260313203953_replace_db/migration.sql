/*
  Warnings:

  - The `status` column on the `Atendimento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createAt` on the `Insumo` table. All the data in the column will be lost.
  - You are about to drop the column `quantidade` on the `Insumo` table. All the data in the column will be lost.
  - You are about to drop the `Estoque` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO');

-- DropForeignKey
ALTER TABLE "Estoque" DROP CONSTRAINT "Estoque_insumoId_fkey";

-- AlterTable
ALTER TABLE "Atendimento" DROP COLUMN "status",
ADD COLUMN     "status" "StatusAtendimento" NOT NULL DEFAULT 'EM_ATENDIMENTO';

-- AlterTable
ALTER TABLE "Insumo" DROP COLUMN "createAt",
DROP COLUMN "quantidade",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Estoque";

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
