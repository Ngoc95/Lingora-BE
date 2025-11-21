import { Router } from 'express'
import { withdrawalController } from '~/controllers/withdrawal.controller'
import { accessTokenValidation, checkPermission } from '~/middlewares/auth.middlewares'
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'
import { createWithdrawalValidation } from '~/middlewares/withdrawal/createWithdrawal.middlewares'
import { updateWithdrawalValidation } from '~/middlewares/withdrawal/updateWithdrawal.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { WithdrawalRequest } from '~/entities/withdrawalRequest.entity'
import { Resource } from '~/enums/resource.enum'
import { RoleName } from '~/enums/role.enum'

const withdrawalRouter = Router()

// Access token validation
withdrawalRouter.use(accessTokenValidation)

// ========================
// USER ENDPOINTS
// ========================

// POST
/**
 * @description : Create withdrawal request
 * @method : POST
 * @path : /withdrawals
 * @header : Authorization
 * @body : {
 *   amount: number
 *   bankName: string
 *   bankAccountNumber: string
 *   bankAccountName: string
 *   bankBranch?: string
 * }
 */
withdrawalRouter.post(
    '',
    wrapRequestHandler(checkPermission('createOwn', Resource.WITHDRAWAL)),
    createWithdrawalValidation,
    wrapRequestHandler(withdrawalController.createWithdrawal)
)

// GET
/**
 * @description : Get user's withdrawal requests
 * @method : GET
 * @path : /withdrawals/me
 * @header : Authorization
 * @query : {
 *   limit?: number
 *   page?: number
 *   status?: WithdrawalStatus
 *   sort?: string (e.g., -createdAt,+amount)
 * }
 */
withdrawalRouter.get(
    '/me',
    wrapRequestHandler(checkPermission('readOwn', Resource.WITHDRAWAL)),
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: WithdrawalRequest.allowSortList })),
    wrapRequestHandler(withdrawalController.getMyWithdrawals)
)

// GET
/**
 * @description : Get user's balance
 * @method : GET
 * @path : /withdrawals/balance
 * @header : Authorization
 */
withdrawalRouter.get(
    '/balance',
    wrapRequestHandler(checkPermission('readOwn', Resource.WITHDRAWAL)),
    wrapRequestHandler(withdrawalController.getMyBalance)
)

// GET
/**
 * @description : Get withdrawal request by ID (own)
 * @method : GET
 * @path : /withdrawals/:id
 * @header : Authorization
 * @params : id
 */
withdrawalRouter.get(
    '/:id',
    wrapRequestHandler(checkPermission('readOwn', Resource.WITHDRAWAL)),
    checkIdParamMiddleware,
    wrapRequestHandler(withdrawalController.getMyWithdrawalById)
)

// ========================
// ADMIN ENDPOINTS
// ========================

// GET
/**
 * @description : Get all withdrawal requests (Admin only)
 * @method : GET
 * @path : /withdrawals/admin/all
 * @header : Authorization
 * @query : {
 *   limit?: number
 *   page?: number
 *   status?: WithdrawalStatus
 *   userId?: number
 *   sort?: string
 * }
 */
withdrawalRouter.get(
    '/admin/all',
    wrapRequestHandler(checkPermission('readAny', Resource.WITHDRAWAL)),
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: WithdrawalRequest.allowSortList })),
    wrapRequestHandler(withdrawalController.getAllWithdrawals)
)

// GET
/**
 * @description : Get withdrawal request by ID (Admin)
 * @method : GET
 * @path : /withdrawals/admin/:id
 * @header : Authorization
 * @params : id
 */
withdrawalRouter.get(
    '/admin/:id',
    wrapRequestHandler(checkPermission('readAny', Resource.WITHDRAWAL)),
    checkIdParamMiddleware,
    wrapRequestHandler(withdrawalController.getWithdrawalByIdAdmin)
)

// PUT
/**
 * @description : Approve withdrawal request (Admin)
 * @method : PUT
 * @path : /withdrawals/admin/:id/approve
 * @header : Authorization
 * @params : id
 */
withdrawalRouter.put(
    '/admin/:id/approve',
    wrapRequestHandler(checkPermission('updateAny', Resource.WITHDRAWAL)),
    checkIdParamMiddleware,
    wrapRequestHandler(withdrawalController.approveWithdrawal)
)

// PUT
/**
 * @description : Reject withdrawal request (Admin)
 * @method : PUT
 * @path : /withdrawals/admin/:id/reject
 * @header : Authorization
 * @params : id
 * @body : {
 *   rejectionReason?: string
 * }
 */
withdrawalRouter.put(
    '/admin/:id/reject',
    wrapRequestHandler(checkPermission('updateAny', Resource.WITHDRAWAL)),
    checkIdParamMiddleware,
    updateWithdrawalValidation,
    wrapRequestHandler(withdrawalController.rejectWithdrawal)
)

// PUT
/**
 * @description : Complete withdrawal request (Admin) - after manual transfer
 * @method : PUT
 * @path : /withdrawals/admin/:id/complete
 * @header : Authorization
 * @params : id
 * @body : {
 *   transactionReference?: string
 * }
 */
withdrawalRouter.put(
    '/admin/:id/complete',
    wrapRequestHandler(checkPermission('updateAny', Resource.WITHDRAWAL)),
    checkIdParamMiddleware,
    updateWithdrawalValidation,
    wrapRequestHandler(withdrawalController.completeWithdrawal)
)

// PUT
/**
 * @description : Mark withdrawal as failed (Admin)
 * @method : PUT
 * @path : /withdrawals/admin/:id/fail
 * @header : Authorization
 * @params : id
 * @body : {
 *   reason?: string
 * }
 */
withdrawalRouter.put(
    '/admin/:id/fail',
    wrapRequestHandler(checkPermission('updateAny', Resource.WITHDRAWAL)),
    checkIdParamMiddleware,
    updateWithdrawalValidation,
    wrapRequestHandler(withdrawalController.failWithdrawal)
)

export default withdrawalRouter

