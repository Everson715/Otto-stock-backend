import { Perfil } from "@prisma/client";
import { prisma } from "../../database/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.{53}$/;

export class AuthService {
  async login(email: string, senhaPlana: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario || !usuario.ativo) {
      throw new Error("Credenciais inválidas ou usuário inativo");
    }

    let senhaCorreta = false;

    if (BCRYPT_HASH_REGEX.test(usuario.senha)) {
      senhaCorreta = await bcrypt.compare(senhaPlana, usuario.senha);
    } else {
      // Caso o usuário tenha sido inserido manualmente via Prisma Studio com senha em texto puro,
      // valida a senha e realiza o upgrade automático para hash bcrypt no banco.
      senhaCorreta = senhaPlana.length > 0 && senhaPlana === usuario.senha;
      if (senhaCorreta) {
        const senhaHash = await bcrypt.hash(senhaPlana, 10);
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { senha: senhaHash }
        });
      }
    }

    if (!senhaCorreta) {
      throw new Error("Credenciais inválidas ou usuário inativo");
    }

    const perfis =
      usuario.perfis && usuario.perfis.length > 0
        ? usuario.perfis
        : ([Perfil.ATENDENTE] as Perfil[]);

    const secret = process.env.JWT_SECRET || "default_dev_secret_123";
    
    const token = jwt.sign(
      {
        id: usuario.id,
        perfis,
        perfil: perfis[0]
      },
      secret,
      { expiresIn: "8h" }
    );

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfis,
        perfil: perfis[0]
      },
      token
    };
  }

  // Apenas para facilitar a criação inicial de um admin
  async createInitialAdmin() {
    const adminExists = await prisma.usuario.findFirst({
      where: { perfis: { has: "ADMIN" } }
    });

    if (adminExists) {
      return { message: "Admin já existe." };
    }

    const senhaHash = await bcrypt.hash("admin123", 10);

    const admin = await prisma.usuario.create({
      data: {
        nome: "Administrador do Sistema",
        email: "admin@clinica.com",
        senha: senhaHash,
        perfis: ["ADMIN"]
      }
    });

    return { message: "Admin criado com sucesso", email: admin.email };
  }
}
