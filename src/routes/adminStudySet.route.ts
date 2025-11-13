import { Router } from 'express'
import { adminStudySetController } from '~/controllers/adminStudySet.controller'
import { accessTokenValidation, checkPermission } from '~/middlewares/auth.middlewares'
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'
import { approveStudySetValidation } from '~/middlewares/adminStudySet/approveStudySet.middlewares'
import { rejectStudySetValidation } from '~/middlewares/adminStudySet/rejectStudySet.middlewares'
import { updateStudySetStatusValidation } from '~/middlewares/adminStudySet/updateStudySetStatus.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { StudySet } from '~/entities/studySet.entity'
import { Resource } from '~/enums/resource.enum'

const adminStudySetRouter = Router()

// Access token validation
adminStudySetRouter.use(accessTokenValidation)

// GET
/**
 * @description : Get all study sets (admin view - includes all statuses)
 * @method : GET
 * @path : /admin/studysets
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
adminStudySetRouter.get(
    '',
    wrapRequestHandler(checkPermission('readAny', Resource.STUDY_SET)),
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: StudySet.allowSortList })),
    wrapRequestHandler(adminStudySetController.getAllStudySets)
)

// GET
/**
 * @description : Get pending study sets (waiting for approval)
 * @method : GET
 * @path : /admin/studysets/pending
 * @header : Authorization
 * @query : {
 *   limit?: number
 *   page?: number
 *   search?: string
 *   sort?: string
 * }
 */
adminStudySetRouter.get(
    '/pending',
    wrapRequestHandler(checkPermission('readAny', Resource.STUDY_SET)),
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: StudySet.allowSortList })),
    wrapRequestHandler(adminStudySetController.getPendingStudySets)
)

// GET
/**
 * @description : Get study set by id (admin can view all)
 * @method : GET
 * @path : /admin/studysets/:id
 * @header : Authorization
 * @params : id
 */
adminStudySetRouter.get(
    '/:id',
    wrapRequestHandler(checkPermission('readAny', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    wrapRequestHandler(adminStudySetController.getStudySetById)
)

// PATCH
/**
 * @description : Approve study set (change status to PUBLISHED)
 * @method : PATCH
 * @path : /admin/studysets/:id/approve
 * @header : Authorization
 * @params : id
 */
adminStudySetRouter.patch(
    '/:id/approve',
    wrapRequestHandler(checkPermission('updateAny', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    approveStudySetValidation,
    wrapRequestHandler(adminStudySetController.approveStudySet)
)

// PATCH
/**
 * @description : Reject study set (change status to REJECTED)
 * @method : PATCH
 * @path : /admin/studysets/:id/reject
 * @header : Authorization
 * @params : id
 * @body : {
 *   reason?: string
 * }
 */
adminStudySetRouter.patch(
    '/:id/reject',
    wrapRequestHandler(checkPermission('updateAny', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    rejectStudySetValidation,
    wrapRequestHandler(adminStudySetController.rejectStudySet)
)

// PATCH
/**
 * @description : Update study set status (admin can change any status)
 * @method : PATCH
 * @path : /admin/studysets/:id/status
 * @header : Authorization
 * @params : id
 * @body : {
 *   status: StudySetStatus
 * }
 */
adminStudySetRouter.patch(
    '/:id/status',
    wrapRequestHandler(checkPermission('updateAny', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    updateStudySetStatusValidation,
    wrapRequestHandler(adminStudySetController.updateStudySetStatus)
)

// DELETE
/**
 * @description : Delete study set (admin can delete any)
 * @method : DELETE
 * @path : /admin/studysets/:id
 * @header : Authorization
 * @params : id
 */
adminStudySetRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteAny', Resource.STUDY_SET)),
    checkIdParamMiddleware,
    wrapRequestHandler(adminStudySetController.deleteStudySetById)
)

export default adminStudySetRouter

