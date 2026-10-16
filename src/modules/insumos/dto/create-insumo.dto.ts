export interface CreateInsumoDto {
    nome: string
    sku?: string
    unidade?: string
    categoria?: string
    fabricante?: string
    quantidadeMinima?: number
}