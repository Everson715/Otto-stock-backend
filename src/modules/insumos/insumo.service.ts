import {prisma} from "../../database/prisma";
import {CreateInsumoDto} from "./dto/create-insumo.dto";
import {UpdateInsumoDto} from "./dto/update-insumo.dto";

export class InsumosService{
    async create (data: CreateInsumoDto){
        return prisma.insumo.create({
            data
        });
    }

    async findAll(page: number = 1, limit: number = 10, nome?: string){
        const skip = (page - 1) * limit;
        const where = nome ? { nome: { contains: nome, mode: 'insensitive' as const } } : {};

        const [items, total] = await Promise.all([
            prisma.insumo.findMany({
                where,
                skip,
                take: limit,
                orderBy: { nome: 'asc' }
            }),
            prisma.insumo.count({ where })
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
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