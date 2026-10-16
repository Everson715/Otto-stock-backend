-- AlterTable: Adicionar coluna "perfis" como array de "Perfil", migrar dados existentes de "perfil" e remover coluna antiga
ALTER TABLE "Usuario" ADD COLUMN "perfis" "Perfil"[] DEFAULT ARRAY['ATENDENTE']::"Perfil"[];

UPDATE "Usuario" SET "perfis" = ARRAY["perfil"] WHERE "perfil" IS NOT NULL;

ALTER TABLE "Usuario" ALTER COLUMN "perfis" SET NOT NULL;

ALTER TABLE "Usuario" DROP COLUMN "perfil";
