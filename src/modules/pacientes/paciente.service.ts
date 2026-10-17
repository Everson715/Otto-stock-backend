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

  async findAllPaginated(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;
    const where: any = { ativo: true };

    const trimmed = search?.trim();
    if (trimmed) {
      const unaccented = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const cpfDigits = trimmed.replace(/\D/g, "");

      const orConditions: any[] = [
        { nome: { contains: trimmed, mode: "insensitive" } },
      ];
      if (unaccented && unaccented !== trimmed) {
        orConditions.push({ nome: { contains: unaccented, mode: "insensitive" } });
      }
      if (cpfDigits.length > 0) {
        orConditions.push({ cpf: { contains: cpfDigits } });
      }

      where.OR = orConditions;
    }

    const [items, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      prisma.paciente.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
