import { NextFunction, Request, Response } from "express"
import { User } from "~/entities/user.entity"
import { VerificationToken } from "~/entities/verificationToken.entity"
import { MoreThan } from "typeorm"
import { MAX_REQUESTS_VERIFY_EMAIL_PER_HOUR_, TokenType } from "~/enums/tokenType.enum"
import { BadRequestError } from "~/core/error.response"

export const sendVerifyAccountEmailValidation = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as User

    // Check rate limit for spam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const recentRequests = await VerificationToken.count({
        where: { user: { id }, createdAt: MoreThan(oneHourAgo), type: TokenType.emailVerifyToken },
        withDeleted: true
    })
    if (recentRequests >= MAX_REQUESTS_VERIFY_EMAIL_PER_HOUR_) {
        throw new BadRequestError({ message: 'Number of requests was more than MAX_REQUEST_ALLOW' })
    }

    return next()
}
