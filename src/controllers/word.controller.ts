import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from "~/core/success.response";
import { wordService } from '~/services/word.service';

class WordController {
    createWord = async (req: Request, res: Response) => {
        return new CREATED({
            message: 'Create word successfully!',
            metaData: await wordService.createWord(req.body)
        }).send(res)
    }

    getAllWords = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get all words successfully',
            metaData: await wordService.getAllWords({
                ...req.query,
                ...req.parseQueryBoolean,
                ...req.parseQueryPagination,
                sort: req.sortParsed
            })
        }).send(res)
    }

    getWordById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Get word successfully',
            metaData: await wordService.getWordById(id)
        }).send(res)
    }

    updateWordById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Update word successfully',
            metaData: await wordService.updateWordById(id, req.body)
        }).send(res)
    }

    deleteWordById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Delete word successfully',
            metaData: await wordService.deleteWordById(id)
        }).send(res)
    }
}

export const wordController = new WordController()