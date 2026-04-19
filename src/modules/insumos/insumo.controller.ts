import { Request,Response } from "express";
import {InsumosService} from "./insumo.service";
import { createInsumoSchema, updateInsumoSchema } from "./dto/insumo.schema";

const service = new InsumosService();

export class InsumoController{
    async create(req:Request,res:Response){
        const data = createInsumoSchema.parse(req.body);
        const insumo = await service.create(data);
        res.status(201).json(insumo);
    }

    async findAll(req:Request,res:Response){
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const nome = req.query.nome as string;

        const result = await service.findAll(page, limit, nome);
        return res.json(result);
    }

    async findOne(req:Request,res:Response){
        const id = Number(req.params.id);
        const insumo = await service.findById(id);
        return res.json(insumo);
    }

    async delete(req: Request, res: Response){
        const id = Number(req.params.id);
        await service.delete(id);
        return res.status(204).send();
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = updateInsumoSchema.parse(req.body);
        const insumo = await service.update(id, data);
        return res.json(insumo);
    }
}