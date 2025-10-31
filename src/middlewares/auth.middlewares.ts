import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import { Regex } from "~/constants/regex";
import { validate } from "./validation.middlewares";
import { checkSchema } from "express-validator";
import { DatabaseService } from "~/services/database.service";
import { AuthRequestError, BadRequestError, ForbiddenRequestError } from "~/core/error.response";
import { User } from "~/entities/user.entity";
import { verifyToken } from "~/utils/jwt";
import { env } from "~/config/env";
import { RefreshToken } from "~/entities/token.entity";
import { Permission, Query } from "accesscontrol";
import { Request, Response, NextFunction } from 'express';
import ac from "~/permissions/accessControl";
import { checkDuplicateUser, checkRolesExistence } from "~/utils/validators";
import { isEmail, isPassword, isRequired, isUsername } from "./common.middlewares";
import validator from "validator";

async function checkUserExistence(userId: number) {
    const userRepository = await DatabaseService.getInstance().getRepository(User)
    const user = await userRepository.findOne({
        where: { id: userId }
    })
    if (!user) {
        throw new AuthRequestError('Invalid user')
    }
    return user
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

                            const foundUser = await User.findOne({
                                where: {
                                    id: decodedAuthorization.userId
                                },
                                relations: ['roles']
                            })

                            if (foundUser) {
                                ; (req as any).user = foundUser as User
                            }

                        } catch (error) {
                            if (error instanceof jwt.TokenExpiredError) {
                                throw new AuthRequestError('Access token expired.')
                            }
                            throw new AuthRequestError('Access token is invalid.')
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