import { Request, Response } from 'express';
import { authService } from '~/services/auth.service';
import { CREATED, SuccessResponse } from '~/core/success.response';
import { User } from '~/entities/user.entity';
import { BadRequestError } from '~/core/error.response';

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
      message: "Register successfully",
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
      message: "Login successfully",
      metaData: {
        user: result.user,
        accessToken: result.accessToken
      }
    }).send(res);
  };

  googleAuth = async (req: Request, res: Response) => {
    const googleProfile = (req as any).googleProfile

    const result = await authService.googleLogin(googleProfile)

    res.cookie('refreshToken', result.refreshToken, cookieOpts);

    return new SuccessResponse({
      message: "Google authentication successful",
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
      message: 'Refresh token successfully',
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
      message: "Get profile successfully",
      metaData: result
    }).send(res)
  }

  sendVerifyAccountEmail = async (req: Request, res: Response) => {
    const user = req.user as User
    await authService
      .sendVerifyAccountEmail({ email: user.email, name: user.username, userId: user.id as number })
      .catch((err) => console.error('Error when send verify email', err))
      .then((res) => {
        console.log(`Send verification email successful with url = ${res}`)
        return
      })

    return new SuccessResponse({ message: 'Send verification email successful!' }).send(res)
  }

  sendVerifyForgotPasswordEmail = async (req: Request, res: Response) => {
    const { email } = req.body
    await authService.sendVerifyForgotPasswordEmail({ email })

    return new SuccessResponse({ message: 'Send change password code successful!' }).send(res)
  }

  verifyAccount = async (req: Request, res: Response) => {
    const user = req.user as User

    // đã check otp ở middleware, giờ chỉ có update status
    return new SuccessResponse({
      message: 'Verify email!',
      metaData: await authService.verifyEmail({ userId: user.id as number })
    }).send(res)
  }

  // đã check otp ở middleware
  verifyForgotPasswordCode = async (req: Request, res: Response) => {
    const { email } = req.body
    const user = await User.findOneBy({ email })

    if (!user) throw new BadRequestError({ message: 'Invalid email!' })

    // Create temporary reset token (expires in 10 minutes)
    const resetToken = await authService.createResetPasswordToken(user.id as number)

    return new SuccessResponse({
      message: 'Code verified successfully!',
      metaData: { resetToken }
    }).send(res)
  }

  resetPassword = async (req: Request, res: Response) => {
    const user = req.user as User // From resetPasswordTokenValidation middleware
    const { newPassword } = req.body

    return new SuccessResponse({
      message: 'Password reset successfully',
      metaData: await authService.handleForgotPassword(user, newPassword)
    }).send(res)
  }
}
export const authController = new AuthController();