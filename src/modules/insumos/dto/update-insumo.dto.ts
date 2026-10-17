import { UnidadeMedida } from "@prisma/client";

export interface UpdateInsumoDto {
  nome?: string;
  sku?: string;
  unidade?: UnidadeMedida;
  categoria?: string;
  fabricante?: string;
  quantidadeMinima?: number;
  ativo?: boolean;
}