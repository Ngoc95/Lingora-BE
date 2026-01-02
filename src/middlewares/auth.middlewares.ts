import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import { Regex } from "../constants/regex";
import { validate } from "./validation.middlewares";
import { checkSchema } from "express-validator";
import { DatabaseService } from "../services/database.service";
import { AuthRequestError, BadRequestError, ForbiddenRequestError } from "../core/error.response";
import { User } from "../entities/user.entity";
import { verifyToken } from "../utils/jwt";
import { env } from "../config/env";
import { RefreshToken } from "../entities/token.entity";
import { Permission, Query } from "accesscontrol";
import { Request, Response, NextFunction } from 'express';
import ac from "../permissions/accessControl";
import { checkDuplicateUser, checkRolesExistence, checkUserExistence } from "../utils/validators";
import { isEmail, isPassword, isRequired, isUsername } from "./common.middlewares";
import validator from "validator";
import { VerificationToken } from "../entities/verificationToken.entity";
import { TokenType } from "../enums/tokenType.enum";

// Helper function to validate user status (BANNED/SUSPENDED/DELETED)
async function validateUserStatus(user: User): Promise<void> {
    const userRepository = await DatabaseService.getInstance().getRepository(User)

    // Check if user is banned
    if (user.status === 'BANNED') {
        throw new BadRequestError({
            message: `Tài khoản của bạn đã bị khóa vĩnh viễn. Lý do: ${user.banReason || 'Vi phạm nghiêm trọng quy định'}`
        })
    }

    // Check if user is deleted
    if (user.status === 'DELETED') {
        throw new BadRequestError({ message: 'Tài khoản không tồn tại' })
    }

    // Check if user is suspended
    if (user.status === 'SUSPENDED') {
        // Check if suspension period has expired
        if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
            user.status = 'ACTIVE' as any
            user.suspendedUntil = undefined
            await userRepository.save(user)
        } else {
            const suspendedUntil = user.suspendedUntil
                ? new Date(user.suspendedUntil).toLocaleDateString('vi-VN')
                : 'không xác định'
            throw new BadRequestError({
                message: `Tài khoản của bạn đã bị tạm khóa đến ${suspendedUntil}. Lý do: ${user.banReason || 'Vi phạm quy định'}`
            })
        }
    }
}

async function validateUserCredentials(identifier: string, password: string) {
    const userRepository = await DatabaseService.getInstance().getRepository(User)

    // Nếu identifier là email → normalize email
    let normalizedIdentifier = identifier
    if (validator.isEmail(identifier)) {
        normalizedIdentifier = validator.normalizeEmail(identifier) || identifier
    }

    const user = await userRepository.findOne({
        where: [{ email: normalizedIdentifier }, { username: identifier }],
        relations: ['roles']
    })

    if (!user) throw new BadRequestError({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestError({ message: 'Invalid credentials' });

    // Validate user status (BANNED/SUSPENDED/DELETED)
    await validateUserStatus(user)

    return user
}

export const registerValidation = validate(
    checkSchema({
        email: {
            ...isRequired('email'),
            ...isEmail,
            custom: {
                options: async (value: string, { req }) => {
                    await checkDuplicateUser(value, req.body.username)
                    if (req.body.roleIds && Array.isArray(req.body.roleIds)) {
                        await checkRolesExistence(req.body.roleIds)
                    }
                    return true
                }
            }
        },
        username: {
            ...isRequired('username'),
            ...isUsername
        },
        password: {
            ...isPassword
        }
    })
)

export const loginValidation = validate(
    checkSchema({
        identifier: {
            notEmpty: true,
            errorMessage: 'Username or email is required.'
        },
        password: {
            notEmpty: true,
            matches: {
                options: Regex.PASSWORD,
                errorMessage: 'Password must be at least 6 characters long and contain at least 1 uppercase letter!'
            },
            custom: {
                options: async (value: string, { req }) => {
                    const user = await validateUserCredentials(req.body.identifier, value)
                    req.user = user
                    return true
                }
            }
        }
    })
)

export const logoutValidation = async (req: any, res: any, next: any) => {
    try {
        const refreshToken = req.cookies?.refreshToken
        if (!refreshToken) {
            throw new AuthRequestError('No refresh token found. Already logged out?')
        }

        const foundToken = await RefreshToken.findOne({
            where: { refreshToken }
        })

        if (!foundToken) {
            throw new AuthRequestError('Refresh token not found in DB')
        }

        req.refreshToken = refreshToken
        next()
    } catch (error) {
        next(error)
    }
}

// validate trong cookie (ko trong body) -> ko dùng schema
export const refreshTokenValidation = async (req: any, res: any, next: any) => {
    try {
        const refreshToken = req.cookies?.refreshToken
        if (!refreshToken) {
            throw new AuthRequestError('Refresh token is required.')
        }

        // verify token
        const decodedRefreshToken = (await verifyToken(
            refreshToken,
            env.JWT_REFRESH_SECRET || 'refresh_secret'
        )) as { userId: number }

        // check token in DB
        const foundToken = await RefreshToken.findOne({
            where: { refreshToken }
        })
        if (!foundToken) throw new BadRequestError({ message: 'Refresh token invalid!' })

        // check user tồn tại
        await checkUserExistence(decodedRefreshToken.userId)

        // attach to request để controller dùng
        req.decodedRefreshToken = decodedRefreshToken
        req.refreshTokenString = refreshToken;

        next()
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new BadRequestError({ message: 'Refresh token expired.' }))
        }
        next(new BadRequestError({ message: 'Refresh token is invalid.' }))
    }
}

export const accessTokenValidation = validate(
    checkSchema(
        {
            authorization: {
                notEmpty: {
                    errorMessage: 'Access token is required.'
                },
                custom: {
                    options: async (value: string, { req }) => {
                        const accessToken = value.split(' ')[1]
                        if (accessToken.length == 0) throw new AuthRequestError('Access token is invalid.')
                        try {
                            const decodedAuthorization = (await verifyToken(accessToken, env.JWT_ACCESS_SECRET as string)) as { userId: number }

                            // check user tồn tại
                            await checkUserExistence(decodedAuthorization.userId)

                            const foundUser = await User.findOne({
                                where: {
                                    id: decodedAuthorization.userId
                                },
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                    avatar: true,
                                    status: true,
                                    suspendedUntil: true,
                                    banReason: true,
                                    proficiency: true
                                },
                                relations: ['roles']
                            })

                            if (foundUser) {
                                // Validate user status (BANNED/SUSPENDED/DELETED)
                                await validateUserStatus(foundUser)

                                    ; (req as any).user = foundUser as User
                            }

                        } catch (error) {
                            if (error instanceof jwt.TokenExpiredError) {
                                throw new AuthRequestError('Access token expired.')
                            }
                            throw error // Re-throw BadRequestError for status checks
                        }
                        return true
                    }
                }
            }
        },
        ['headers']
    )
)

/**
 * Middleware kiểm tra quyền của user dựa vào danh sách role.
 * Nếu user có ít nhất 1 role được phép thực hiện action trên resource → cho phép truy cập.
 */
export const checkPermission = (action: keyof Query, resource: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userRoles = req.user?.roles

        if (!userRoles || userRoles.length === 0) {
            throw new AuthRequestError('Unauthorized! User has no roles assigned.')
        }

        // Duyệt qua tất cả roles của user để kiểm tra quyền
        let isGranted = false

        for (const role of userRoles) {
            const permission = ac.can(role.name)[action](resource) as Permission
            if (permission.granted) {
                isGranted = true
                break
            }
        }

        if (!isGranted) {
            throw new ForbiddenRequestError('Forbidden! You do not have sufficient permissions.')
        }

        return next()
    }
}

export const optionalAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    const authorizationHeader = req.headers.authorization

    if (!authorizationHeader) {
        return next()
    }

    const token = authorizationHeader.split(' ')[1] || authorizationHeader

    try {
        const decoded = (await verifyToken(token, env.JWT_ACCESS_SECRET as string)) as { userId: number }

        const foundUser = await User.findOne({
            where: { id: decoded.userId },
            relations: ['roles']
        })

        if (!foundUser) {
            throw new AuthRequestError('User not found')
        }

        req.user = foundUser
        next()
    } catch (error) {
        next(new AuthRequestError('Access token is invalid.'))
    }
}

export const verifyAccountEmailCodeValidation = validate(
    checkSchema(
        {
            code: {
                ...isRequired('code'),
                isNumeric: true,
                custom: {
                    options: async (code, { req }) => {
                        const user = (req as Request).user

                        if (!user) throw new BadRequestError({ message: 'Please log in again!' })
                        //check is equaly
                        const tokenInDb = await VerificationToken.findOne({
                            where: { user: { id: user?.id }, type: TokenType.emailVerifyToken }
                        })

                        if (!tokenInDb || tokenInDb.code != code) throw new AuthRequestError('Wrong code')
                        return true
                    }
                }
            }
        },
        ['body']
    )
)

export const verifyForgotPasswordCodeValidation = validate(
    checkSchema(
        {
            code: {
                ...isRequired('code'),
                in: ['query'],
                isNumeric: true,
                custom: {
                    options: async (code, { req }) => {
                        const { email } = (req as Request).body

                        if (!email) {
                            throw new BadRequestError({ message: 'Invalid email!' })
                        }

                        // Check if code matches with email
                        const tokenInDb = await VerificationToken.findOne({
                            where: {
                                user: { email },
                                type: TokenType.resetPasswordToken
                            }
                        })

                        if (!tokenInDb || tokenInDb.code != code) {
                            throw new AuthRequestError('Wrong code!')
                        }

                        return true
                    }
                }
            },
            email: {
                ...isRequired('email'),
                in: ['body'],
                isEmail: {
                    errorMessage: 'Email is invalid'
                }
            }
        },
        ['query', 'body']
    )
)

export const resetPasswordTokenValidation = validate(
    checkSchema(
        {
            newPassword: {
                ...isRequired('newPassword'),
                ...isPassword,
                custom: {
                    options: async (value, { req }) => {
                        const authHeader = (req as Request).headers.authorization

                        if (!authHeader || !authHeader.startsWith('Bearer ')) {
                            throw new AuthRequestError('Reset token is required')
                        }

                        const token = authHeader.split(' ')[1]
                        const decoded = verifyToken(token, env.JWT_ACCESS_SECRET) as any

                        if (!decoded || decoded.tokenType !== TokenType.resetPasswordToken) {
                            throw new AuthRequestError('Invalid reset token')
                        }

                        // Get user from decoded token
                        const user = await User.findOne({
                            where: { id: decoded.userId },
                            relations: ['roles']
                        })

                        if (!user) {
                            throw new AuthRequestError('User not found')
                        }

                        // Attach user to request
                        ; (req as Request).user = user
                        return true
                    }
                }
            }
        },
        ['body']
    )
)