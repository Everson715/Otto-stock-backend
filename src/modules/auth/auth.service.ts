import { prisma } from "../../database/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class AuthService {
  async login(email: string, senhaPlana: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario || !usuario.ativo) {
      throw new Error("Credenciais inválidas ou usuário inativo");
    }

    const senhaCorreta = await bcrypt.compare(senhaPlana, usuario.senha);

    if (!senhaCorreta) {
      throw new Error("Credenciais inválidas ou usuário inativo");
    }

    const secret = process.env.JWT_SECRET || "default_dev_secret_123";
    
    const token = jwt.sign(
      {
        id: usuario.id,
        perfil: usuario.perfil
      },
      secret,
      { expiresIn: "8h" }
    );

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      },
      token
    };
  }

  // Apenas para facilitar a criação inicial de um admin
  async createInitialAdmin() {
    const adminExists = await prisma.usuario.findFirst({
      where: { perfil: "ADMIN" }
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
        perfil: "ADMIN"
      }
    });

    return { message: "Admin criado com sucesso", email: admin.email };
  }
}
