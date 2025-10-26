import { Request, Response, NextFunction } from 'express';
import { authService } from '~/services/auth.service';
import { CREATED, SuccessResponse } from '~/core/success.response';
import { User } from '~/entities/user.entity';

const isProd = process.env.NODE_ENV === 'production';

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax' as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
};

class AuthController {
  register = async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    res.cookie('refreshToken', result.refreshToken, cookieOpts);

    return new CREATED({
      message: "Đăng ký tài khoản thành công",
      metaData: {
        user: result.user,
        accessToken: result.accessToken
      }
    }).send(res);
  };

  login = async (req: Request, res: Response) => {
    const user = (req as any).user as User
    const result = await authService.login(user)

    res.cookie('refreshToken', result.refreshToken, cookieOpts);

    return new SuccessResponse({
      message: "Đăng nhập thành công",
      metaData: {
        user: result.user,
        accessToken: result.accessToken
      }
    }).send(res);
  };

  refreshToken = async (req: Request, res: Response) => {
    const { decodedRefreshToken, refreshTokenString: oldToken } = req as any;

    const result = await authService.refreshToken(decodedRefreshToken.userId, oldToken);

    res.cookie('refreshToken', result.refreshToken, cookieOpts);

    return new SuccessResponse({
      message: 'Làm mới token thành công',
      metaData: { accessToken: result.accessToken }
    }).send(res);
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = (req as any).refreshToken
    const result = await authService.logout(refreshToken)

    // Xóa cookie ở client
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict'
    })

    return new SuccessResponse({
      message: result.message
    }).send(res)
  }

  me = async (req: Request, res: Response) => {
    const user = (req as any).user as User

    const result = await authService.me(user.id)

    return new SuccessResponse({
      message: "Lấy thông tin user thành công",
      metaData: result
    }).send(res)
  }

}
export const authController = new AuthController();