import { Router } from "express";
import { reportController } from "../controllers/report.controller";
import { Resource } from "../enums/resource.enum";
import { accessTokenValidation, checkPermission } from "../middlewares/auth.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "../middlewares/common.middlewares";
import { createReportValidation } from "../middlewares/report/createReport.middlewares";
import { updateReportStatusValidation } from "../middlewares/report/updateReportStatus.middlewares";
import { handleReportValidation } from "../middlewares/report/handleReport.middlewares";
import { wrapRequestHandler } from "../utils/handler";

const reportRouter = Router();

// access token validation
reportRouter.use(accessTokenValidation);

// POST
/**
 * @description : Create a new report
 * @method : POST
 * @path : /reports
 * @header : Authorization
 * @body : {
 *  targetType: TargetType (POST, STUDY_SET, COMMENT)
 *  targetId: number
 *  reason: string (1-500 chars)
 * }
 */
reportRouter.post(
    '',
    createReportValidation,
    wrapRequestHandler(reportController.create)
);

// GET
/**
 * @description : Get all reports (Admin only)
 * @method : GET
 * @path : /reports
 * @header : Authorization
 * @query : {
 *  page?: number (default: 1)
 *  limit?: number
 *  sort?: string (e.g., "-createdAt" or "+createdAt")
 *  status?: ReportStatus (PENDING, ACCEPTED, REJECTED)
 *  targetType?: TargetType (POST, STUDY_SET, COMMENT)
 *  reportType?: ReportType (SPAM, HARASSMENT, HATE_SPEECH, etc.)
 *  createdBy?: number (filter by reporter user ID)
 *  search?: string (search by reason)
 * }
 */
reportRouter.get(
    '',
    wrapRequestHandler(checkPermission('readAny', Resource.REPORT)),
    checkQueryMiddleware({
        numbericFields: ['createdBy'],
    }),
    wrapRequestHandler(parseSort({ allowSortList: ['createdAt'] })),
    wrapRequestHandler(reportController.getAll)
);

// GET
/**
 * @description : Get report by id (Admin only)
 * @method : GET
 * @path : /reports/:id
 * @header : Authorization
 * @params : id (number)
 */
reportRouter.get(
    '/:id',
    wrapRequestHandler(checkPermission('readAny', Resource.REPORT)),
    checkIdParamMiddleware,
    wrapRequestHandler(reportController.getById)
);

// PATCH
/**
 * @description : Update report status (Admin only)
 * @method : PATCH
 * @path : /reports/:id/status
 * @header : Authorization
 * @params : id (number)
 * @body : {
 *  status: ReportStatus (ACCEPTED or REJECTED)
 * }
 */
reportRouter.patch(
    '/:id/status',
    wrapRequestHandler(checkPermission('updateAny', Resource.REPORT)),
    checkIdParamMiddleware,
    updateReportStatusValidation,
    wrapRequestHandler(reportController.updateStatus)
);

// PATCH
/**
 * @description : Handle report with action (Admin only)
 * @method : PATCH
 * @path : /reports/:id/handle
 * @header : Authorization
 * @params : id (number)
 * @body : {
 *  status: ReportStatus (ACCEPTED or REJECTED)
 *  action?: {
 *    type: ReportActionType (DELETE_CONTENT, HIDE_CONTENT, WARN_USER, SUSPEND_USER, BAN_USER)
 *    reason?: string (optional note)
 *    duration?: number (for SUSPEND_USER, 1-365 days)
 *  }
 * }
 */
reportRouter.patch(
    '/:id/handle',
    wrapRequestHandler(checkPermission('updateAny', Resource.REPORT)),
    checkIdParamMiddleware,
    handleReportValidation,
    wrapRequestHandler(reportController.handleReport)
);

// DELETE
/**
 * @description : Delete report by id (Admin only)
 * @method : DELETE
 * @path : /reports/:id
 * @header : Authorization
 * @params : id (number)
 */
reportRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteAny', Resource.REPORT)),
    checkIdParamMiddleware,
    wrapRequestHandler(reportController.delete)
);

export default reportRouter;
