import { CreateLikeBodyReq } from '~/dtos/req/like/createLikeBody.req'
import { Like } from '~/entities/like.entity'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { unGetData } from '~/utils'

class LikeService {
    like = async ({ targetId, targetType, user }: CreateLikeBodyReq) => {
        const foundLike = await Like.findOne({
            where: {
                createdBy: { id: user.id },
                targetId,
                targetType
            },
            relations: {
                createdBy: true
            },
            withDeleted: true
        })

        if (!foundLike) {
            const newLike = Like.create({
                createdBy: { id: user.id },
                targetId,
                targetType
            })

            const savedLike = await newLike.save()

            // Emit event for new like
            eventBus.emit(EVENTS.LIKE, {
                createdBy: user,
                targetId,
                targetType
            })

            return unGetData({ fields: ['createdBy'], object: savedLike })
        }

        await Like.getRepository().restore({ id: foundLike.id })

        // Emit event for restored like
        eventBus.emit(EVENTS.LIKE, {
            createdBy: user,
            targetId: foundLike.targetId,
            targetType: foundLike.targetType
        })
        return foundLike
    }

    unLike = async ({ targetId, targetType, user }: CreateLikeBodyReq) => {
        return await Like.getRepository().softDelete({
            createdBy: {
                id: user.id
            },
            targetId,
            targetType
        })
    }
}

export const likeService = new LikeService()
