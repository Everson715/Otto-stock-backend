import { Perfil } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../database/prisma";

const usuarioSelect = {
  id: true,
  nome: true,
  email: true,
  perfis: true,
  ativo: true,
  createdAt: true
};

export class UsuarioService {
  async create(data: {
    nome: string;
    email: string;
    senha: string;
    perfis: Perfil[];
  }) {
    const senhaHash = await bcrypt.hash(data.senha, 10);
    const perfisUnicos = Array.from(new Set(data.perfis));

    return prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        perfis: perfisUnicos
      },
      select: usuarioSelect
    });
  }

  async findAll() {
    return prisma.usuario.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: usuarioSelect
    });
  }

  async findById(id: number) {
    return prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect
    });
  }

  async update(
    id: number,
    data: {
      nome?: string;
      email?: string;
      senha?: string;
      perfis?: Perfil[];
      ativo?: boolean;
    }
  ) {
    const updateData: Record<string, any> = { ...data };

    if (data.senha) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    if (data.perfis) {
      updateData.perfis = Array.from(new Set(data.perfis));
    }

    return prisma.usuario.update({
      where: { id },
      data: updateData,
      select: usuarioSelect
    });
  }

  async updatePerfis(id: number, perfis: Perfil[]) {
    const perfisUnicos = Array.from(new Set(perfis));

    return prisma.usuario.update({
      where: { id },
      data: { perfis: perfisUnicos },
      select: usuarioSelect
    });
  }

  async delete(id: number) {
    return prisma.usuario.update({
      where: { id },
      data: { ativo: false },
      select: usuarioSelect
    });
  }
}
