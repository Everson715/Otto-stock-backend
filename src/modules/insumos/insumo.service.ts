import {prisma} from "../../database/prisma";

export class InsumosService{
    async create (data: any){
        return prisma.insumo.create({
            data
        });
    }

    async findAll(){
        return prisma.insumo.findMany();
    }

    async findById(id: number){
        return prisma.insumo.findUnique({
            where: {id}
        });
    }

    async update(id: number, data: any){
        return prisma.insumo.update({
            where: {id},
            data
        });
    }

    async delete(id: number){
        return prisma.insumo.delete({
            where: {id}
        });
    }
}