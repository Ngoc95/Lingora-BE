import { Request, Response } from 'express'
import { BadRequestError } from '~/core/error.response'
import { SuccessResponse } from '~/core/success.response'
import { User } from '~/entities/user.entity'
import { TargetType } from '~/enums/targetType.enum'
import { likeService } from '~/services/like.service'

class LikeController {
    like = async (req: Request, res: Response) => {
        const targetId = parseInt(req.params?.targetId || req.params?.id)
        const targetType = req.query?.targetType as TargetType

        if (!targetType) {
            throw new BadRequestError({ message: 'Target type is required in query params' })
        }

        const user = req.user as User

        return new SuccessResponse({
            message: `Like ${targetType.toLowerCase()} successfully!`,
            metaData: await likeService.like({ user, targetId, targetType })
        }).send(res)
    }

    unlike = async (req: Request, res: Response) => {
        const targetId = parseInt(req.params?.targetId || req.params?.id)
        const targetType = req.query?.targetType as TargetType

        if (!targetType) {
            throw new BadRequestError({ message: 'Target type is required in query params' })
        }

        const user = req.user as User

        return new SuccessResponse({
            message: `Unlike ${targetType.toLowerCase()} successfully!`,
            metaData: await likeService.unLike({
                user,
                targetId,
                targetType
            })
        }).send(res)
    }
}

export const likeController = new LikeController()
