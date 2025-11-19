import { Router } from 'express'
import { vnpayReturnController } from '~/controllers/vnpayReturn.controller'
import { wrapRequestHandler } from '~/utils/handler'

const vnpayReturnRouter = Router()

// GET
/**
 * @description : Handle VNPay return callback
 * @method : GET
 * @path : /vnpay/return
 * @query : VNPay return parameters (vnp_ResponseCode, vnp_TxnRef, vnp_Amount, etc.)
 * @note : This endpoint handles both webapp (redirect) and mobile app (JSON response)
 */
vnpayReturnRouter.get('/return', wrapRequestHandler(vnpayReturnController.handleReturn))

export default vnpayReturnRouter

