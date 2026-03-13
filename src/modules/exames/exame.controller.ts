import { Request, Response } from "express";
import { ExameService} from "./exame.service";
import { CreateExameDto } from "./dto/create-exame.dto";
import { UpdateExameDto } from "./dto/update-exame.dto";

const service = new ExameService();

export class ExameController {
    async create(req: Request, res: Response) {
        const data : CreateExameDto = req.body
        const exame = await service.create(data);
        res.status(201).json(exame);
    }
    async findAll(req: Request, res: Response) {
        const exames = await service.findAll();
        return res.json(exames);
    }
     async findOne(req: Request, res: Response) {
        const id = Number(req.params.id)
        const exame = await service.findById(id);
        return res.json(exame)
    }
    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data : UpdateExameDto = req.body
        const exame = await service.update(id, data);
        res.json(exame);
    }
    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await service.delete(id);
        return res.status(204).send();
    }
}