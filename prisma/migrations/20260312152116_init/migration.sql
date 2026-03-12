-- CreateTable
CREATE TABLE "Medico" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "crm" TEXT,

    CONSTRAINT "Medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exame" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estoque" (
    "id" SERIAL NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,

    CONSTRAINT "Estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExameInsumo" (
    "id" SERIAL NOT NULL,
    "exameId" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ExameInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atendimento" (
    "id" SERIAL NOT NULL,
    "medicoId" INTEGER NOT NULL,
    "exameId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_ATENDIMENTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Estoque_insumoId_key" ON "Estoque"("insumoId");

-- AddForeignKey
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameInsumo" ADD CONSTRAINT "ExameInsumo_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameInsumo" ADD CONSTRAINT "ExameInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Medico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
