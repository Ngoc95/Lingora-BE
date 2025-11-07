import { Router } from "express";
import { userProgressController } from "~/controllers/userProgress.controller"
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { getTopicProgressValidation } from "~/middlewares/userProgress/getTopicProgress.middlewares";
import { createWordProgressValidation } from "~/middlewares/userProgress/createWordProgress.middlewares"
import { updateWordProgressValidation } from "~/middlewares/userProgress/updateWordProgress.middlewares"
import { wrapRequestHandler } from "~/utils/handler"
import { getCategoryProgressValidation } from "~/middlewares/userProgress/getCategoryProgress.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "~/middlewares/common.middlewares";
import { Topic } from "~/entities/topic.entity";
import { getWordsForStudyValidation } from "~/middlewares/userProgress/getWordsForStudy.middlewares";

const userProgressRouter = Router()

userProgressRouter.use(accessTokenValidation)

//POST
/**
 * @description : Create word progress
 * @method : POST
 * @path : 
 * @header : Authorization
 * @query : wordIds: number[]
 */
userProgressRouter.post(
  '',
  createWordProgressValidation,
  wrapRequestHandler(userProgressController.createManyWordProgress)
)

//PATCH
/**
 * @description : Update word progress
 * @method : PATCH
 * @path : 
 * @header : Authorization
 * @query : wordProgress: [
 *   {
 *     wordId: number,
 *     wrongCount: number,
 *     reviewedDate: ISO Date
 *   }
 * ]
 */
userProgressRouter.patch(
  '',
  updateWordProgressValidation,
  wrapRequestHandler(userProgressController.updateManyWordProgress)
)

// GET
/**
 * @description : Get all categories for USER
 * @method : GET
 * @path : /categories
 * @header : Authorization
 * @query : {limit: number, page:number, search:string}
 * search?: string (search for name, description)
 */
userProgressRouter.get(
  '/categories',
  checkQueryMiddleware(),
  wrapRequestHandler(userProgressController.getAllCategoriesForUser)
)

// GET
/**
 * @description : Get category progress (with topics) by categoryId
 * @method : GET
 * @path : /categories/:id/topics
 * @header : Authorization
 * @params : id
 * @query : {limit: number, page:number, search:string, sort: string}
 * sort like -id,+name
 * sort field must be in ['id', 'name']
 * search?: string (search for topic.name, topic.description)
 */
userProgressRouter.get(
  '/categories/:id/topics',
  checkIdParamMiddleware,
  checkQueryMiddleware(),
  getCategoryProgressValidation,
  wrapRequestHandler(parseSort({ allowSortList: Topic.allowSortList })),
  wrapRequestHandler(userProgressController.getCategoryProgressById)
)

// GET
/**
 * @description : Get topic progress (with words) by topicId
 * @method : GET
 * @path : /topics/:id/words
 * @header : Authorization
 * @params : id
 * @query : {limit: number, page:number, search:string, hasLearned: boolean}
 * search?: string (search for word.word, word.meaning)
 */
userProgressRouter.get(
  '/topics/:id/words',
  checkIdParamMiddleware,
  checkQueryMiddleware({
    booleanFields: ['hasLearned']
  }),
  getTopicProgressValidation,
  wrapRequestHandler(userProgressController.getTopicProgressById)
)

// GET
/**
 * @description : Get words for study by topicId
 * @method : GET
 * @path : /topics/:id/study
 * @header : Authorization
 * @params : id
 * @query : count: number
 */
userProgressRouter.get(
  '/topics/:id/study',
  checkIdParamMiddleware,
  getWordsForStudyValidation,
  wrapRequestHandler(userProgressController.getWordsForStudy)
)

// GET
/**
 * @description : Get words for review by topicId
 * @method : GET
 * @path : /review
 * @header : Authorization
 * @query : {limit: number, page:number}
 */
userProgressRouter.get(
  '/review',
  checkIdParamMiddleware,
  checkQueryMiddleware(),
  wrapRequestHandler(userProgressController.getWordsForReview)
)

export default userProgressRouter;