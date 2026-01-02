import { Router } from 'express'
import { studySetController } from '../controllers/studySet.controller'
import { accessTokenValidation, checkPermission } from '../middlewares/auth.middlewares'
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '../middlewares/common.middlewares'
import { createStudySetValidation } from '../middlewares/studySet/createStudySet.middlewares'
import { updateStudySetValidation } from '../middlewares/studySet/updateStudySet.middlewares'
import { wrapRequestHandler } from '../utils/handler'
import { StudySet } from '../entities/studySet.entity'
import { Resource } from '../enums/resource.enum'

const studySetRouter = Router()

// Access token validation
studySetRouter.use(accessTokenValidation)

// POST
/**
 * @description : Create a new study set
 * @method : POST
 * @path : /studysets
 * @header : Authorization
 * @body : {
 *   title: string
 *   description?: string
 *   visibility?: StudySetVisibility (PRIVATE, PUBLIC)
 *   price?: number
 *   flashcards?: FlashcardInputReq[]
 *   quizzes?: QuizInputReq[]
 * }
 * @note : Status is automatically set: PRIVATE → DRAFT, PUBLIC → PUBLISHED
 */
studySetRouter.post(
    '',
    wrapRequestHandler(checkPermission('createOwn', Resource.STUDY_SET)),
    createStudySetValidation,
    wrapRequestHandler(studySetController.createStudySet)
)

// GET
/**
 * @description : Get all study sets (public and published)
 * @method : GET
 * @path : /studysets
 * @header : Authorization
 * @query : {
 *   limit?: number
 *   page?: number
 *   search?: string
 *   visibility?: StudySetVisibility
 *   status?: StudySetStatus
 *   minPrice?: number
 *   maxPrice?: number
 *   sort?: string (e.g., -createdAt,+title)
 * }
 * sort field must be in ['id', 'title', 'createdAt', 'price']
 */
studySetRouter.get(
    '',
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: StudySet.allowSortList })),
    wrapRequestHandler(studySetController.getAllStudySets)
)

// GET
/**
 * @description : Get own study sets
 * @method : GET
 * @path : /studysets/own
 * @header : Authorization
 * @query : {
 *   limit?: number
 *   page?: number
 *   search?: string
 *   visibility?: StudySetVisibility
 *   status?: StudySetStatus
 *   minPrice?: number
 *   maxPrice?: number
 *   sort?: string
 * }
 */
studySetRouter.get(
    '/own',
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: StudySet.allowSortList })),
    wrapRequestHandler(studySetController.getOwnStudySets)
)

// GET
/**
 * @description : Get study set by id
 * @method : GET
 * @path : /studysets/:id
 * @header : Authorization
 * @params : id
 */
studySetRouter.get(
    '/:id',
    checkIdParamMiddleware,
    wrapRequestHandler(studySetController.getStudySetById)
)

// PATCH
/**
 * @description : Update study set by id
 * @method : PATCH
 * @path : /studysets/:id
 * @header : Authorization
 * @params : id
 * @body : {
 *   title?: string
 *   description?: string
 *   visibility?: StudySetVisibility
 *   price?: number
 *   status?: StudySetStatus
 *   flashcards?: FlashcardInputReq[]
 *   quizzes?: QuizInputReq[]
 * }
 */
studySetRouter.patch(
    '/:id',
    wrapRequestHandler(checkPermission('updateOwn', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    updateStudySetValidation,
    wrapRequestHandler(studySetController.updateStudySetById)
)

// DELETE
/**
 * @description : Delete study set by id
 * @method : DELETE
 * @path : /studysets/:id
 * @header : Authorization
 * @params : id
 */
studySetRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteOwn', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    wrapRequestHandler(studySetController.deleteStudySetById)
)

// POST
/**
 * @description : Buy study set via VNPay
 * @method : POST
 * @path : /studysets/:id/buy
 * @header : Authorization
 * @params : id
 * @note : Returns payment URL. Uses default returnUrl from env config.
 */
studySetRouter.post(
    '/:id/buy',
    checkIdParamMiddleware,
    wrapRequestHandler(studySetController.buyStudySet)
)

export default studySetRouter

