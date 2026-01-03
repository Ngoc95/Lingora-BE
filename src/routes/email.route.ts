import { Router } from 'express';
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation } from '~/middlewares/auth.middlewares'
import { authController } from '~/controllers/auth.controller'
import { sendVerifyAccountEmailValidation } from '~/middlewares/email/sendVerifyAccountEmailValidation.middlewares'

const emailRouter = Router()

// POST

// send verify forgot password email
emailRouter.post(
    '/send-forgot-password-verification',
    wrapRequestHandler(authController.sendVerifyForgotPasswordEmail)
)

emailRouter.use(accessTokenValidation)

// send verify account email
emailRouter.post(
    '/send-account-verification',
    wrapRequestHandler(sendVerifyAccountEmailValidation),
    wrapRequestHandler(authController.sendVerifyAccountEmail)
)

export default emailRouter
