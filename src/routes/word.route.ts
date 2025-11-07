import { Router } from "express";
import { wordController } from "~/controllers/word.controller";
import { Word } from "~/entities/word.entity";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "~/middlewares/common.middlewares";
import { createWordValidation } from "~/middlewares/word/createWord.middlewares";
import { updateWordValidation } from "~/middlewares/word/updateWord.middlewares";
import { wrapRequestHandler } from "~/utils/handler";

const wordRouter = Router();

// access token validation
wordRouter.use(accessTokenValidation)

// POST
/**
 * @description : Create a new word
 * @method : POST
 * @path : 
 * @header : Authorization
 * @body : {
 *  word: string
 *  meaning: string
 *  phonetic?: string
 *  cefrLevel?: string
 *  type?: string
 *  example?: string
 *  exampleTranslation?: string
 *  audioUrl?: string
 *  imageUrl?: string
 *  topicId?: number
 * }
 */
wordRouter.post(
    '',
    wrapRequestHandler(checkPermission('createAny', Resource.WORD)),
    createWordValidation,
    wrapRequestHandler(wordController.createWord)
)

// GET
/**
 * @description : Get all words for ADMIN (not for LEARNER)
 * @method : GET
 * @path : 
 * @header : Authorization
 * @query : {limit: number, page:number, search:string, cefrLevel:CefrLevel, type:WordType, topicId:number, sort: string}
 * search?: string (search for word, meaning, example)
 * sort like -id,+word
 * sort field must be in ['id', 'word', 'cefrLevel']
 * filter field must be in [
 *    hasTopic?: boolean (true: words having topicId, false: words not having topicId)
 *    cefrLevel?: CefrLevel (A1, A2, B1, B2, C1, C2)
 *    type?: WordType (coi trong enums/wordType.enum.ts)
 * ]
 */
wordRouter.get(
    '',
    checkQueryMiddleware({
        booleanFields: ['hasTopic']
    }),
    wrapRequestHandler(parseSort({ allowSortList: Word.allowSortList })),
    wrapRequestHandler(wordController.getAllWords)
)

// GET
/**
 * @description : Get word by id
 * @method : GET
 * @path : /:id
 * @header : Authorization
 * @params : id
 */
wordRouter.get(
    '/:id',
    checkIdParamMiddleware,
    wrapRequestHandler(wordController.getWordById)
)

//PATCH
/**
 * @description : Update word by id
 * @method : PATCH
 * @path : /:id
 * @header : Authorization
 * @params : id
 * @body : {
    word?: string
    meaning?: string
    phonetic?: string
    cefrLevel?: CefrLevel (A1, A2, B1, B2, C1, C2)
    type?: WordType (mở wordType.enum.ts để xem các loại từ)
    example?: string
    exampleTranslation?: string
    audioUrl?: string
    imageUrl?: string
    topicId?: number
 * }
 */
wordRouter.patch(
    '/:id',
    wrapRequestHandler(checkPermission('updateAny', Resource.WORD)),
    checkIdParamMiddleware,
    updateWordValidation,
    wrapRequestHandler(wordController.updateWordById)
)

//DELETE
/**
 * @description : Delete word by id
 * @method : DELETE
 * @path : /:id
 * @header : Authorization
 */
wordRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteAny', Resource.WORD)),
    checkIdParamMiddleware,
    wrapRequestHandler(wordController.deleteWordById)
)

export default wordRouter;