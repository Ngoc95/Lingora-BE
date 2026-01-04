import { sendMessage } from '~/sockets'
import { EVENTS } from '~/events-handler/constants'
import { User } from '~/entities/user.entity'
import { TargetType } from '~/enums/targetType.enum'
import eventBus from '~/events-handler/eventBus'
import { NotificationTarget, NotificationType } from '~/enums/notification.enum'
import { notificationService } from '~/services/notification.service'
import { Post } from '~/entities/post.entity'
import { Comment } from '~/entities/comment.entity'
import { StudySet } from '~/entities/studySet.entity'

eventBus.on(
    EVENTS.LIKE,
    async ({
        createdBy,
        targetId,
        targetType
    }: {
        targetId: number
        createdBy: User
        targetType: TargetType
    }) => {
        // Get owner of the target (Post, Comment, StudySet)
        const ownerId = await getOwnerId(targetId, targetType)

        // Don't send notification if user likes their own content
        if (!ownerId || ownerId === createdBy.id) {
            return
        }

        // Create notification
        const likeNotification = await createLikeNotification(
            targetId,
            targetType,
            ownerId,
            createdBy
        )

        // Send notification via socket
        sendMessage({ event: 'notification', userId: ownerId, data: likeNotification })
    }
)

const getOwnerId = async (targetId: number, targetType: TargetType): Promise<number | null> => {
    try {
        if (targetType === TargetType.POST) {
            const post = await Post.findOne({
                where: { id: targetId },
                relations: ['createdBy'],
                select: {
                    id: true,
                    createdBy: {
                        id: true
                    }
                }
            })
            return post?.createdBy?.id || null
        } else if (targetType === TargetType.COMMENT) {
            const comment = await Comment.findOne({
                where: { id: targetId },
                relations: ['createdBy'],
                select: {
                    id: true,
                    createdBy: {
                        id: true
                    }
                }
            })
            return comment?.createdBy?.id || null
        } else if (targetType === TargetType.STUDY_SET) {
            const studySet = await StudySet.findOne({
                where: { id: targetId },
                relations: ['owner'],
                select: {
                    id: true,
                    owner: {
                        id: true
                    }
                }
            })
            return studySet?.owner?.id || null
        }
        return null
    } catch (error) {
        console.error('Error getting owner id:', error)
        return null
    }
}

const createLikeNotification = async (
    targetId: number,
    targetType: TargetType,
    ownerId: number,
    createdBy: User
) => {
    const targetTypeLabel =
        targetType === TargetType.POST
            ? 'bài viết'
            : targetType === TargetType.COMMENT
                ? 'bình luận'
                : 'học liệu'

    // Nếu like comment, lấy thông tin post hoặc studySet mà comment thuộc về
    let postId: number | undefined = undefined
    let studySetId: number | undefined = undefined

    if (targetType === TargetType.COMMENT) {
        const comment = await Comment.findOne({
            where: { id: targetId },
            select: {
                id: true,
                targetType: true,
                targetId: true
            }
        })
        
        // Nếu comment thuộc về POST, lưu postId
        if (comment?.targetType === TargetType.POST) {
            postId = comment.targetId
        }
        // Nếu comment thuộc về STUDY_SET, lưu studySetId
        else if (comment?.targetType === TargetType.STUDY_SET) {
            studySetId = comment.targetId
        }
    }

    const notification = await notificationService.createNotification(
        NotificationType.LIKE,
        {
            message: `${createdBy.username} đã thích ${targetTypeLabel} của bạn`,
            data: {
                targetId,
                targetType,
                ownerId,
                ...(postId && { postId }), // Thêm postId nếu có
                ...(studySetId && { studySetId }), // Thêm studySetId nếu có
                createdBy: {
                    id: createdBy.id,
                    email: createdBy.email,
                    username: createdBy.username,
                    avatar: createdBy.avatar
                }
            }
        },
        NotificationTarget.ONLY_USER,
        [ownerId]
    )

    return notification
}
