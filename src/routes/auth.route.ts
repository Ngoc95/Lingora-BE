import { Router } from 'express';
import { authController } from '~/controllers/auth.controller'
import { accessTokenValidation, loginValidation, logoutValidation, refreshTokenValidation, registerValidation } from '~/middlewares/auth.middlewares';
import { wrapRequestHandler } from '~/utils/handler';

const authRouter = Router();

authRouter.post('/register', registerValidation, wrapRequestHandler(authController.register));
authRouter.post('/login', loginValidation, wrapRequestHandler(authController.login));
authRouter.post('/refresh-token', refreshTokenValidation, wrapRequestHandler(authController.refreshToken));
authRouter.post('/logout', logoutValidation, wrapRequestHandler(authController.logout));

authRouter.use(accessTokenValidation)

authRouter.get('/me', wrapRequestHandler(authController.me))


export default authRouter;
