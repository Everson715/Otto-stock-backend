import { prisma } from "../../database/prisma";
import { CreateExameDto } from "./dto/create-exame.dto";
import { UpdateExameDto } from "./dto/update-exame.dto";

export class ExameService {
    //create
    async create(data: CreateExameDto) {
        return prisma?.exame.create({
            data
        })
    }
    async findAll() {
        return prisma.exame.findMany();
    }
    async findById(id: number) {
        return prisma.exame.findUnique({
            where: {id}
        })
    }
    async update(id: number, data: UpdateExameDto) {
        return prisma.exame.update({
            where: {id},
            data
        })
    }
    async delete(id: number) {
        return prisma.exame.delete({
            where: {id}
        })
    }
}
