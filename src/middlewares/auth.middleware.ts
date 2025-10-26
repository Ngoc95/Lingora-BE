import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import { Regex } from "~/constants/regex";
import { validate } from "./validation.middleware";
import { checkSchema } from "express-validator";
import { DatabaseService } from "~/services/database.service";
import { Role } from "~/entities/role.entity";
import { AuthRequestError, BadRequestError, ForbiddenRequestError } from "~/core/error.response";
import { User } from "~/entities/user.entity";
import { verifyToken } from "~/utils/jwt";
import { env } from "~/config/env";
import { RefreshToken } from "~/entities/token.entity";
import { In } from "typeorm";

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

export async function checkRolesExistence(roleIds: number[]) {
    const roleRepository = await DatabaseService.getInstance().getRepository(Role)

    const roles = await roleRepository.find({
        where: { id: In(roleIds) }
    })

    if (roles.length !== roleIds.length) {
        throw new BadRequestError({ message: "One or more roles not found" })
    }

    return roles
}

async function checkDuplicateUser(email: string, username: string) {
    const userRepository = await DatabaseService.getInstance().getRepository(User)
    const existingUser = await userRepository.findOne({
        where: [{ email }, { username }]
    })
    if (existingUser) {
        throw new BadRequestError({ message: 'User already exists' })
    }
}

async function validateUserCredentials(identifier: string, password: string) {
    const userRepository = await DatabaseService.getInstance().getRepository(User)
    const user = await userRepository.findOne({
        where: [{ email: identifier }, { username: identifier }],
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
            notEmpty: true,
            matches: {
                options: Regex.EMAIL,
                errorMessage: 'Invalid email format'
            },
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
            notEmpty: true,
            isLength: {
                options: {
                    min: 5,
                    max: 20
                },
                errorMessage: 'Username must be between 5 and 20 characters long'
            }
        },
        password: {
            notEmpty: true,
            matches: {
                options: Regex.PASSWORD,
                errorMessage: 'Password must be at least 6 characters long and contain at least 1 uppercase letter!'
            }
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

// export const checkPermission = (action: keyof Query, resource: string) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     const role = req.user?.role
//     if (!role) {
//       throw new AuthRequestError('Unauthorized!')
//     }
//     const permission = ac.can(role.name)[action](resource) as Permission

//     if (!permission.granted) {
//       throw new ForbiddenRequestError('Forbidden!')
//     }

//     return next()
//   }
// }