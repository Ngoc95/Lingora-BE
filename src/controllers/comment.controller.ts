import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { BadRequestError } from '../core/error.response'
import { CREATED, SuccessResponse } from '../core/success.response'
import { User } from '../entities/user.entity'
import { TargetType } from '../enums/targetType.enum'
import { commentService } from '../services/comment.service'
import { postService } from '../services/post.service'

class CommentController {
    getChildComment = async (
        req: Request<ParamsDictionary, any, { content: string; parentId: number }>,
        res: Response
    ) => {
        const parentId = req.params?.parentId == 'null' ? null : parseInt(req.params?.parentId)
        const targetId = parseInt(req.params?.targetId || req.params?.id)
        const targetType = (req.query?.targetType as TargetType) || TargetType.POST
        const user = req.user as User

        return new SuccessResponse({
            message: 'Get child comment successfully!',
            metaData: await commentService.findChildComment(targetId, parentId, targetType, user.id as number)
        }).send(res)
    }

    getCommentById = async (req: Request, res: Response) => {
        if (!req.params?.commentId) throw new BadRequestError({ message: 'Comment id invalid' })

        const commentId = parseInt(req.params.commentId)

        return new SuccessResponse({
            message: 'Get comment by id successfully!',
            metaData: await commentService.getCommentById(commentId)
        }).send(res)
    }

    createComment = async (req: Request<ParamsDictionary, any, { content: string; parentId: number }>, res: Response) => {
        const targetId = parseInt(req.params?.targetId || req.params?.id)
        const targetType = (req.query?.targetType as TargetType) || TargetType.POST
        const user = req.user as User

        return new CREATED({
            message: 'Create comment successfully!',
            metaData: await commentService.comment({
                user,
                targetId,
                targetType,
                ...req.body
            })
        }).send(res)
    }

    updateComment = async (req: Request<ParamsDictionary, any, { content: string; parentId: number }>, res: Response) => {
        const targetId = parseInt(req.params?.targetId || req.params?.id)
        const targetType = (req.query?.targetType as TargetType) || TargetType.POST

        if (!req.params?.commentId) throw new BadRequestError({ message: 'Comment id invalid' })

        const commentId = parseInt(req.params?.commentId)
        const user = req.user as User

        return new SuccessResponse({
            message: 'Update comment successfully!',
            metaData: await commentService.updateComment({
                user,
                targetId,
                targetType,
                commentId,
                ...req.body
            })
        }).send(res)
    }

    deleteComment = async (req: Request<ParamsDictionary, any, any>, res: Response) => {
        if (!req.params?.commentId) throw new BadRequestError({ message: 'Comment id invalid' })

        const commentId = parseInt(req.params?.commentId)
        const user = req.user as User

        return new SuccessResponse({
            message: 'Delete comment successfully!',
            metaData: await postService.deleteCommentPost(user.id as number, commentId)
        }).send(res)
    }
}

export const commentController = new CommentController()
