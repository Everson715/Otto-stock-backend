import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.usuario.findFirst();
  
  if (existingUser) {
    console.log("Banco já possui usuários. Seed ignorado.");
    return;
  }

  const email = process.env.ADMIN_EMAIL || "admin@clinica.com";
  const passwordStr = process.env.ADMIN_PASSWORD || "admin123";
  
  const hashedPassword = await bcrypt.hash(passwordStr, 10);

  await prisma.usuario.create({
    data: {
      nome: "Administrador do Sistema",
      email: email,
      senha: hashedPassword,
      perfil: "ADMIN"
    }
  });

  console.log(`Admin criado com o email: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
