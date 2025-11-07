import { Router } from "express";
import { topicController } from "~/controllers/topic.controller";
import { Topic } from "~/entities/topic.entity";
import { Word } from "~/entities/word.entity";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "~/middlewares/common.middlewares";
import { createTopicValidation } from "~/middlewares/topic/createTopic.middlewares";
import { updateTopicValidation } from "~/middlewares/topic/updateTopic.middlewares";

import { wrapRequestHandler } from "~/utils/handler";

const topicRouter = Router();

// access token validation
topicRouter.use(accessTokenValidation)

// POST
/**
 * @description : Create a new topic
 * @method : POST
 * @path : /
 * @header : Authorization
 * @body : {
 *  name: string
    description?: string
    categoryId?: number
 * }
 */
topicRouter.post(
    '/',
    wrapRequestHandler(checkPermission('createAny', Resource.TOPIC)),
    createTopicValidation,
    wrapRequestHandler(topicController.createTopic)
)

// GET
/**
 * @description : Get all topics for ADMIN (not for LEARNER)
 * @method : GET
 * @path : 
 * @header : Authorization
 * @query : {limit: number, page:number, search:string}
 * search for [name, description]
 * sort like -id,+name
 * sort field must be in ['id', 'name']
 * filter field must be in [
 *    hasCategory?: boolean (true: only topics with category, false: only topics without category)
 * ]
 */
topicRouter.get(
    '',
    checkQueryMiddleware({
        booleanFields: ['hasCategory']
    }),
    wrapRequestHandler(parseSort({ allowSortList: Topic.allowSortList })),
    wrapRequestHandler(topicController.getAllTopics)
)

// GET
/**
 * @description : Get topic and its words by id for ADMIN (not for LEARNER)
 * @method : GET
 * @path : /:id/words
 * @header : Authorization
 * @params : id
 * @query : {limit: number, page:number, search:string, cefrLevel: CefrLevel, type: WordType, sort: string}
 * search?: string (search for word.word, word.meaning)
 * sort like -id,+word,+cefrLevel
 * sort field must be in ['id', 'word', 'cefrLevel']
 * filter field must be in [
 *    cefrLevel?: CefrLevel (A1, A2, B1, B2, C1, C2)
 *    type?: WordType  (mở wordType.enum.ts để xem các loại từ)
 * ]
 */
topicRouter.get(
    '/:id/words',
    checkIdParamMiddleware,
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: Word.allowSortList })),
    wrapRequestHandler(topicController.getTopicById)
)

//PATCH
/**
 * @description : Update topic by id
 * @method : PATCH
 * @path : /:id
 * @header : Authorization
 * @params : id
 * @body : {
    name?: string,
    description?: string,
    categoryId?: number
 * }
 */
topicRouter.patch(
    '/:id',
    wrapRequestHandler(checkPermission('updateAny', Resource.TOPIC)),
    checkIdParamMiddleware,
    updateTopicValidation,
    wrapRequestHandler(topicController.updateTopicById)
)

//DELETE
/**
 * @description : Delete topic by id
 * @method : DELETE
 * @path : /:id
 * @header : Authorization
 */
topicRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteAny', Resource.TOPIC)),
    checkIdParamMiddleware,
    wrapRequestHandler(topicController.deleteTopicById)
)

export default topicRouter;