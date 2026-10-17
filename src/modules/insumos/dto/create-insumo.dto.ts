import { UnidadeMedida } from "@prisma/client";

export interface CreateInsumoDto {
  nome: string;
  sku?: string;
  unidade: UnidadeMedida;
  categoria?: string;
  fabricante?: string;
  quantidadeMinima?: number;
}