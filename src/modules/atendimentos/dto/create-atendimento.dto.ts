export interface CreateAtendimentoDto {
  id_paciente: number;
  id_profissional: number;
  data_atendimento: Date;
  descricao: string;
  medicoId: number;
  exameId: number;
}