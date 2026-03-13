import { Request,Response } from "express";
import {InsumosService} from "./insumo.service";
import {CreateInsumoDto} from "./dto/create-insumo.dto";
import {UpdateInsumoDto} from "./dto/update-insumo.dto";

const service = new InsumosService();

export class InsumoController{
    async create(req:Request,res:Response){
        const data: CreateInsumoDto = req.body;
        const insumo = await service.create(data);
        res.status(201).json(insumo);
    }

    async findAll(req:Request,res:Response){
        const insumos = await service.findAll();
        return res.json(insumos);
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
        const data: UpdateInsumoDto = req.body;
        const insumo = await service.update(id, data);
        return res.json(insumo);
        }
}