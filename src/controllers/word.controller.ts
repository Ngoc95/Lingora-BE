import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from "~/core/success.response";
import { wordService } from '~/services/word.service';
import { BadRequestError } from '~/core/error.response';

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

    lookupWord = async (req: Request, res: Response) => {
        const { term } = req.query
        if (typeof term !== 'string') {
            throw new BadRequestError({ message: 'term query is required' })
        }

        return new SuccessResponse({
            message: 'Lookup word successfully',
            metaData: await wordService.lookupWord({
                term,
            })
        }).send(res)
    }

    suggestWords = async (req: Request, res: Response) => {
        const { term, limit } = req.query
        
        if (typeof term !== 'string') {
            throw new BadRequestError({ message: 'term query is required' })
        }

        const limitNum = typeof limit === 'string' ? parseInt(limit) : 10
        const validLimit = isNaN(limitNum) || limitNum < 1 || limitNum > 50 ? 10 : limitNum

        return new SuccessResponse({
            message: 'Get word suggestions successfully',
            metaData: await wordService.suggestWords(term, validLimit)
        }).send(res)
    }
}

export const wordController = new WordController()