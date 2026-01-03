import { Request, Response } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { BadRequestError } from '~/core/error.response'
import { vnpayReturnService } from '~/services/vnpayReturn.service'

class VNPayReturnController {
    /**
     * Handle VNPay return callback
     * Supports both webapp (redirect) and android app (JSON response)
     */
    handleReturn = async (req: Request, res: Response) => {
        try {
            // Support both GET (redirect) and POST (manual call)
            // If POST, params are in body. If GET, params are in query.
            const params = req.method === 'POST' ? req.body : req.query

            const result = await vnpayReturnService.handleVNPayReturn(params as Record<string, string>)
            
            // If manual call (POST) or mobile app logic request
            const isManualCall = req.method === 'POST'
            const isMobileApp = req.headers['x-platform'] === 'mobile' || req.headers['user-agent']?.includes('okhttp')

            if (isManualCall || isMobileApp) {
                console.log('manual/mobile app return')
                return new SuccessResponse({
                    message: result.success ? 'Payment successful' : 'Payment failed',
                    metaData: result,
                }).send(res)
            } else {
                console.log('web app redirect')
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
                const redirectUrl = result.success
                    ? `${frontendUrl}/studysets/${result.studySetId}?payment=success`
                    : `${frontendUrl}/studysets?payment=failed`

                res.redirect(redirectUrl)
            }
        } catch (error) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
            const isManualCall = req.method === 'POST'
            const isMobileApp = req.headers['x-platform'] === 'mobile' || req.headers['user-agent']?.includes('okhttp')

            if (isManualCall || isMobileApp) {
                if (error instanceof BadRequestError) {
                    return res.status(error.statusCode).json({
                        status: 'Error',
                        code: error.statusCode,
                        message: error.message,
                    })
                }
                return res.status(500).json({
                    status: 'Error',
                    code: 500,
                    message: 'Internal server error',
                })
            } else {
                // Redirect to error page for webapp
                res.redirect(`${frontendUrl}/studysets?payment=error`)
            }
        }
    }

    /**
     * Handle VNPay IPN (Instant Payment Notification)
     * Used for backend-to-backend confirmation
     */
    handleIpn = async (req: Request, res: Response) => {
        try {
            const result = await vnpayReturnService.handleVNPayIPN(req.query as Record<string, string>)
            return res.status(200).json(result)
        } catch (error) {
            console.error('IPN Controller Error:', error)
            return res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
        }
    }
}

export const vnpayReturnController = new VNPayReturnController()

