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
            const result = await vnpayReturnService.handleVNPayReturn(req.query as Record<string, string>)
            // Check if request is from mobile app (via User-Agent or custom header)
            const isMobileApp = req.headers['x-platform'] === 'mobile' || req.headers['user-agent']?.includes('okhttp')

            if (isMobileApp) {
                console.log('mobile app')
                // Return JSON for mobile app
                return new SuccessResponse({
                    message: result.success ? 'Payment successful' : 'Payment failed',
                    metaData: result,
                }).send(res)
            } else {
                console.log('web app')
                // Redirect for webapp
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
                const redirectUrl = result.success
                    ? `${frontendUrl}/studysets/${result.studySetId}?payment=success`
                    : `${frontendUrl}/studysets?payment=failed`

                res.redirect(redirectUrl)
            }
        } catch (error) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
            const isMobileApp = req.headers['x-platform'] === 'mobile' || req.headers['user-agent']?.includes('okhttp')

            if (isMobileApp) {
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
}

export const vnpayReturnController = new VNPayReturnController()

