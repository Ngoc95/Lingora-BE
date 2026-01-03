import { Router } from 'express';
import { authController } from '~/controllers/auth.controller'
import {
    accessTokenValidation,
    loginValidation,
    logoutValidation,
    refreshTokenValidation,
    registerValidation,
    resetPasswordTokenValidation,
    verifyAccountEmailCodeValidation,
    verifyForgotPasswordCodeValidation
} from '~/middlewares/auth.middlewares';
import { sendVerifyAccountEmailValidation } from '~/middlewares/email/sendVerifyAccountEmailValidation.middlewares'
import { wrapRequestHandler } from '~/utils/handler';
import { googleAuthValidation } from '~/middlewares/googleAuth.middlewares';

const authRouter = Router();

authRouter.post('/register', registerValidation, wrapRequestHandler(authController.register));
authRouter.post('/login', loginValidation, wrapRequestHandler(authController.login));

/**
 * Google OAuth Authentication
 * @description : Authenticate with Google ID token
 * @method : POST
 * @path : /google
 * @body : { idToken: string }
 * @response : { user, accessToken } + refreshToken cookie
 */
authRouter.post('/google', googleAuthValidation, wrapRequestHandler(authController.googleAuth));

authRouter.post('/refresh-token', refreshTokenValidation, wrapRequestHandler(authController.refreshToken));
authRouter.post('/logout', logoutValidation, wrapRequestHandler(authController.logout));

/**
 * Password Reset Flow (Forgot Password)
 * @description : Request password reset OTP via email
 * @method : POST
 * @path : /password-reset/request
 * @body : email
 */
authRouter.post(
    '/password-reset/request',
    wrapRequestHandler(authController.sendVerifyForgotPasswordEmail)
)

/**
 * @description : Verify password reset OTP code
 * @method : POST
 * @path : /password-reset/verify
 * @query : code
 * @body : email
 * @response : { resetToken: string }
 */
authRouter.post(
    '/password-reset/verify',
    verifyForgotPasswordCodeValidation,
    wrapRequestHandler(authController.verifyForgotPasswordCode)
)

/**
 * @description : Confirm password reset with token
 * @method : POST
 * @path : /password-reset/confirm
 * @header : Authorization: Bearer <resetToken>
 * @body : newPassword
 */
authRouter.post(
    '/password-reset/confirm',
    resetPasswordTokenValidation,
    wrapRequestHandler(authController.resetPassword)
)

authRouter.use(accessTokenValidation)

authRouter.get('/me', wrapRequestHandler(authController.me))

/**
 * Email Verification Flow (Account Verification)
 * @description : Request email verification OTP
 * @method : POST
 * @path : /email-verification/request
 * @header : Authorization: Bearer <accessToken>
 */
authRouter.post(
    '/email-verification/request',
    wrapRequestHandler(sendVerifyAccountEmailValidation),
    wrapRequestHandler(authController.sendVerifyAccountEmail)
)

/**
 * @description : Verify account with OTP code
 * @method : POST
 * @path : /email-verification/verify
 * @header : Authorization: Bearer <accessToken>
 * @body : code
 */
authRouter.post(
    '/email-verification/verify',
    verifyAccountEmailCodeValidation,
    wrapRequestHandler(authController.verifyAccount)
)

export default authRouter;
