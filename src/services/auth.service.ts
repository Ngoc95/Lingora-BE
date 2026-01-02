import { DatabaseService } from './database.service'
import { User } from '../entities/user.entity'
import { Role } from '../entities/role.entity'
import { RefreshToken } from '../entities/token.entity'
import bcrypt from 'bcrypt'
import { hashData, signAccessToken, signRefreshToken, signResetPasswordToken } from '../utils/jwt'
import { BadRequestError } from '../core/error.response'
import { unGetData } from '../utils'
import { RoleName } from '../enums/role.enum'
import { VerificationToken } from '../entities/verificationToken.entity'
import { sendResetPasswordCode, sendVerifyEmail } from './email.service'
import { TokenType } from '../enums/tokenType.enum'
import { generateVerificationCode } from '../utils/email'
import { UserStatus } from '../enums/userStatus.enum'
import eventBus from '../events-handler/eventBus'
import { EVENTS } from '../events-handler/constants'

export class AuthService {
    private db = DatabaseService.getInstance()

    // Register
    async register(data: { username: string; email: string; password: string }) {
        const userRepo = await this.db.getRepository(User)
        const roleRepo = await this.db.getRepository(Role)
        const tokenRepo = await this.db.getRepository(RefreshToken)

        const hashedPassword = await bcrypt.hash(data.password, 10)

        const userRole = await roleRepo.findOne({ where: { name: RoleName.LEARNER } })
        if (!userRole) throw new BadRequestError({ message: 'Default role Learner not found' })

        const newUser = userRepo.create({
            username: data.username,
            email: data.email,
            password: hashedPassword,
            roles: [userRole]
        })
        await userRepo.save(newUser)

        const [accessToken, refreshToken] = await Promise.all([
            signAccessToken(newUser.id),
            signRefreshToken(newUser.id)
        ])

        await tokenRepo.save({ refreshToken, user: newUser })

        return {
            user: unGetData({ fields: ['password'], object: newUser }),
            accessToken,
            refreshToken
        }
    }

    // Login
    async login(user: User) {
        const tokenRepo = await this.db.getRepository(RefreshToken)
        const [accessToken, refreshToken] = await Promise.all([
            signAccessToken(user.id),
            signRefreshToken(user.id)
        ])
        await tokenRepo.save({ refreshToken, user })
        return {
            user: unGetData({ fields: ['password'], object: user }),
            accessToken,
            refreshToken
        }
    }

    // Logout
    async logout(refreshToken: string) {
        const tokenRepo = await this.db.getRepository(RefreshToken)
        await tokenRepo.delete({ refreshToken })
        return { message: 'Logged out successfully' }
    }

    // Refresh Token
    async refreshToken(userId: number, oldToken: string) {
        const tokenRepo = await this.db.getRepository(RefreshToken)
        await tokenRepo.delete({ refreshToken: oldToken })

        const [newAccessToken, newRefreshToken] = await Promise.all([
            signAccessToken(userId),
            signRefreshToken(userId)
        ])

        await tokenRepo.save({ refreshToken: newRefreshToken, user: { id: userId } as User })

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }
    }

    // Me
    async me(userId: number) {
        const userRepo = await this.db.getRepository(User)
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['roles']
        })
        if (!user) throw new BadRequestError({ message: 'User not found' })

        const { password, ...rest } = user
        return {
            ...rest,
        }
    }

    // Send verify account email
    sendVerifyAccountEmail = async ({ email, userId, name }: { email: string; userId: number; name: string }) => {
        //delete all code for user previously
        await VerificationToken.getRepository().softDelete({ user: { id: userId }, type: TokenType.emailVerifyToken })

        //send email
        const code = await sendVerifyEmail({ to: email, template: 'welcome', name })

        //save email token
        const emailToken = VerificationToken.create({ code, user: { id: userId }, type: TokenType.emailVerifyToken })
        await VerificationToken.save(emailToken)

        return code
    }

    // Send verify forgot password email
    sendVerifyForgotPasswordEmail = async ({ email }: { email: string }) => {
        const code = generateVerificationCode()

        const foundUser = await User.findOneBy({ email })

        if (!foundUser) throw new BadRequestError({ message: 'Email invalid!' })

        //delete all code for user previously
        await VerificationToken.getRepository().softDelete({
            user: { id: foundUser.id },
            type: TokenType.resetPasswordToken
        })

        await sendResetPasswordCode({
            to: email,
            body: { code, email },
            template: 'resetPassword',
            subject: 'Reset password verification'
        })

        //save email token
        const resetPasswordToken = VerificationToken.create({
            code,
            user: { id: foundUser.id },
            type: TokenType.resetPasswordToken
        })
        await VerificationToken.save(resetPasswordToken)
    }

    // Update user status (after verify email in middleware)
    verifyEmail = async ({ userId }: { userId: number }) => {
        // Set user status to active and delete verification token
        await Promise.all([
            User.update(userId, { status: UserStatus.ACTIVE }),
            VerificationToken.getRepository().softDelete({
                user: { id: userId },
                type: TokenType.emailVerifyToken
            })
        ])

        //return info user after update
        return this.me(userId)
    }

    /**Handle forgot password
  * @Step 1: validate otp code in email (done in middleware)
  * @Step 2: update new password
  * @Step 3: invalidate refresh token of user so far
  */
    handleForgotPassword = async (foundUser: User, newPassword: string) => {
        //update new password
        // delete refresh token of this user before
        await Promise.all([
            this.updatePassword(foundUser, newPassword),
            this.deleteRefreshTokenByUser(foundUser.id as number),
            VerificationToken.getRepository().softDelete({ user: { id: foundUser.id }, type: TokenType.resetPasswordToken })
        ])

        eventBus.emit(EVENTS.CHANGE_PASSWORD, { userId: foundUser.id })

        return {}
    }

    updatePassword = async (user: User, newPassword: string) => {
        user.password = hashData(newPassword)

        return await user.save()
    }

    createResetPasswordToken = async (userId: number) => {
        // Create JWT token with 10 minutes expiration
        return await signResetPasswordToken(userId)
    }

    deleteRefreshTokenByUser = async (userId: number) => {
        return await RefreshToken.getRepository().softDelete({
            user: {
                id: userId
            }
        })
    }
}

export const authService = new AuthService()
