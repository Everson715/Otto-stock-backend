import { prisma } from "../../database/prisma";

export class PacienteService {
  async create(data: { nome: string; cpf: string; dataNascimento?: Date | string; contato?: string }) {
    return prisma.paciente.create({ 
      data: { 
        ...data, 
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined 
      } 
    });
  }

  async findAll() {
    return prisma.paciente.findMany({ 
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });
  }

  async findById(id: number) {
    return prisma.paciente.findUnique({ 
      where: { id } 
    });
  }

  async update(id: number, data: { nome?: string; cpf?: string; dataNascimento?: Date | string; contato?: string }) {
    return prisma.paciente.update({ 
      where: { id }, 
      data: {
        ...data,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined
      }
    });
  }

  async delete(id: number) {
    // Soft delete
    return prisma.paciente.update({
      where: { id },
      data: { ativo: false }
    });
  }
}
