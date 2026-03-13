export interface MovimentacaoDto {
  id: number;
  tipo: string;
  quantidade: number;
  data: Date;
  produtoId: number;
  insumoId: number;
}