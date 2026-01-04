import { FindOptionsWhere } from 'typeorm'
import { BadRequestError } from '~/core/error.response'
import { CreateCommentBodyReq } from '~/dtos/req/comment/createCommentBody.req'
import { UpdateCommentBodyReq } from '~/dtos/req/comment/updateCommentBody.req'
import { Comment } from '~/entities/comment.entity'
import { Like } from '~/entities/like.entity'
import { Post } from '~/entities/post.entity'
import { StudySet } from '~/entities/studySet.entity'
import { TargetType } from '~/enums/targetType.enum'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { unGetData } from '~/utils'

class CommentService {
    findChildComment = async (targetId: number, parentId: number | null, targetType: TargetType, userId?: number) => {
        const where: FindOptionsWhere<Comment> = {
            targetId: targetId,
            targetType
        }

        if (parentId !== null) {
            where.parentComment = { id: parentId }
        }

        const childComments = await Comment.find({
            where,
            select: {
                id: true,
                content: true,
                createdAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true
                },
                parentComment: {
                    id: true
                },
                targetId: true,
                targetType: true
            },
            relations: ['createdBy']
        })

        // Add likeCount and isAlreadyLike for each comment if userId is provided
        if (userId !== undefined) {
            const commentsWithLikes = await Promise.all(
                childComments.map(async (comment) => {
                    const [likeCount, isAlreadyLike] = await Promise.all([
                        this.findNumberLikeByCommentId(comment.id!),
                        this.isAlreadyLikeComment(comment.id!, userId)
                    ])
                    return {
                        ...comment,
                        likeCount,
                        isAlreadyLike
                    }
                })
            )
            return commentsWithLikes
        }

        return childComments
    }

    getCommentById = async (commentId: number) => {
        const comment = await Comment.findOne({
            where: { id: commentId },
            select: {
                id: true,
                content: true,
                createdAt: true,
                targetId: true,
                targetType: true,
                createdBy: {
                    id: true,
                    username: true,
                    avatar: true
                }
            },
            relations: ['createdBy']
        })

        if (!comment) {
            throw new BadRequestError({ message: 'Comment not found!' })
        }

        // Get target info (post or study set)
        let targetInfo: any = null

        if (comment.targetType === TargetType.POST) {
            const post = await Post.findOne({
                where: { id: comment.targetId },
                select: {
                    id: true,
                    title: true
                }
            })
            if (post) {
                targetInfo = {
                    id: post.id,
                    type: TargetType.POST,
                    title: post.title
                }
            }
        } else if (comment.targetType === TargetType.STUDY_SET) {
            const studySet = await StudySet.findOne({
                where: { id: comment.targetId },
                select: {
                    id: true,
                    title: true
                }
            })
            if (studySet) {
                targetInfo = {
                    id: studySet.id,
                    type: TargetType.STUDY_SET,
                    title: studySet.title
                }
            }
        }

        return {
            ...comment,
            target: targetInfo
        }
    }

    comment = async ({ content, targetId, targetType, user, parentId = null }: CreateCommentBodyReq) => {
        const comment = Comment.create({
            content,
            createdBy: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar
            },
            parentComment: {
                id: parentId
            } as Comment,
            targetId,
            targetType
        })

        await comment.save()

        const fullComment = await Comment.findOne({
            where: { id: comment.id },
            select: {
                id: true,
                content: true,
                createdAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true
                },
                parentComment: {
                    id: true,
                    createdBy: {
                        id: true
                    }
                },
                targetId: true,
                targetType: true
            },
            relations: ['createdBy', 'parentComment', 'parentComment.createdBy']
        })
        if (!fullComment) throw new BadRequestError({ message: 'Unauthorize for this comment' })

        // Get owner of the target (Post or StudySet)
        let ownerId: number | undefined
        if (targetType === TargetType.POST) {
            const post = await Post.findOne({
                where: { id: targetId },
                relations: ['createdBy'],
                select: { createdBy: { id: true } }
            })
            ownerId = post?.createdBy?.id
        } else if (targetType === TargetType.STUDY_SET) {
            const studySet = await StudySet.findOne({
                where: { id: targetId },
                relations: ['owner'],
                select: { owner: { id: true } }
            })
            ownerId = studySet?.owner?.id
        }

        //emit event
        if (ownerId) {
            eventBus.emit(EVENTS.COMMENT, {
                targetId,
                targetType,
                ownerId,
                createdBy: user,
                parentCommentOwnerId: fullComment.parentComment?.createdBy.id,
                parentCommentId: parentId,
            })
        }

        return fullComment
    }

    updateComment = async ({ content, targetId, targetType, user, commentId }: UpdateCommentBodyReq) => {
        const foundComment = await Comment.findOne({
            where: {
                id: commentId,
                targetId,
                targetType,
                createdBy: {
                    id: user.id
                }
            },
            relations: ['createdBy']
        })

        if (!foundComment) throw new BadRequestError({ message: 'Comment not found!' })

        //mapping
        foundComment.content = content

        return unGetData({
            object: await foundComment.save(),
            fields: [
                'createdBy.password',
                'createdBy.status',
                // 'createdBy.streak',
                'createdBy.deletedAt',
                'createdBy.createdAt',
                'createdBy.updatedAt'
            ]
        })
    }

    async checkOwnComment(userId: number, commentId: number) {
        const foundComment = await Comment.exists({
            where: {
                id: commentId,
                createdBy: {
                    id: userId
                }
            }
        })

        if (!foundComment) throw new BadRequestError({ message: 'Unauthorize for this comment' })
    }

    findNumberLikeByCommentId = async (commentId: number) => {
        return Like.countBy({
            targetId: commentId,
            targetType: TargetType.COMMENT
        })
    }

    isAlreadyLikeComment = async (commentId: number, userId: number) => {
        return Like.exists({
            where: {
                createdBy: {
                    id: userId
                },
                targetId: commentId,
                targetType: TargetType.COMMENT
            },
            relations: ['createdBy'],
            withDeleted: false
        })
    }
}

export const commentService = new CommentService()
