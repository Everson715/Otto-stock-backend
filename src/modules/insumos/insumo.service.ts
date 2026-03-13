import {prisma} from "../../database/prisma";
import {CreateInsumoDto} from "./dto/create-insumo.dto";
import {UpdateInsumoDto} from "./dto/update-insumo.dto";

export class InsumosService{
    async create (data: CreateInsumoDto){
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

    async update(id: number, data: UpdateInsumoDto){
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