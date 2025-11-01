import { DatabaseService } from './database.service'
import { User } from '~/entities/user.entity'
import { Role } from '~/entities/role.entity'
import { RefreshToken } from '~/entities/token.entity'
import bcrypt from 'bcrypt'
import { signAccessToken, signRefreshToken } from '~/utils/jwt'
import { BadRequestError } from '~/core/error.response'
import { unGetData } from '~/utils'
import { RoleName } from '~/enums/role.enum'

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
}

export const authService = new AuthService()
