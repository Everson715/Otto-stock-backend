import { PrismaClient, UnidadeMedida } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.usuario.findFirst();

  if (!existingUser) {
    const email = process.env.ADMIN_EMAIL || "admin@clinica.com";
    const passwordStr = process.env.ADMIN_PASSWORD || "admin123";

    const hashedPassword = await bcrypt.hash(passwordStr, 10);

    await prisma.usuario.create({
      data: {
        nome: "Administrador do Sistema",
        email: email,
        senha: hashedPassword,
        perfis: ["ADMIN"],
      },
    });

    console.log(`Admin criado com o email: ${email}`);
  } else {
    console.log("Banco já possui usuários. Seed de usuário ignorado.");
  }

  const insumosIniciais: Array<{
    nome: string;
    sku: string;
    unidade: UnidadeMedida;
    categoria: string;
    quantidadeMinima: number;
  }> = [
    {
      nome: "Seringa Descartável 5ml",
      sku: "INS-SER-5ML",
      unidade: UnidadeMedida.UN,
      categoria: "Descartáveis",
      quantidadeMinima: 50,
    },
    {
      nome: "Luvas de Procedimento M",
      sku: "INS-LUV-M",
      unidade: UnidadeMedida.CX,
      categoria: "EPI",
      quantidadeMinima: 10,
    },
    {
      nome: "Álcool Etílico 70%",
      sku: "INS-ALC-70",
      unidade: UnidadeMedida.FRASCO,
      categoria: "Antissépticos",
      quantidadeMinima: 15,
    },
    {
      nome: "Reagente Hemograma Completo",
      sku: "INS-REA-HEM",
      unidade: UnidadeMedida.ML,
      categoria: "Reagentes",
      quantidadeMinima: 200,
    },
  ];

  for (const item of insumosIniciais) {
    await prisma.insumo.upsert({
      where: { nome: item.nome },
      update: {},
      create: item,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
