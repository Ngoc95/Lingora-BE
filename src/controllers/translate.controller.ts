import { Request, Response } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { translateService } from '~/services/translate.service'

class TranslateController {
    translatePhrase = async (req: Request, res: Response) => {
        const { text, sourceLang, targetLang } = req.body || {}

        const result = await translateService.translatePhrase({
            text,
            sourceLang,
            targetLang,
        })

        return new SuccessResponse({
            message: "Translate phrase successfully",
            metaData: result,
        }).send(res)
    }
}

export const translateController = new TranslateController()





