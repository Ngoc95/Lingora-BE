import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { CREATED, SuccessResponse } from '~/core/success.response'
import { CreatePostBodyReq } from '~/dtos/req/post/createPostBody.req'
import { UpdatePostBodyReq } from '~/dtos/req/post/updatePostBody.req'
import { User } from '~/entities/user.entity'
import { postService } from '~/services/post.service'
import { GetAllPostsQueryReq } from '~/dtos/req/post/getAllPostsQuery.req'
import { PostTopic } from '~/enums/postTopic.enum'
import { PostStatus } from '~/enums/postStatus.enum'

class PostController {
    getById = async (req: Request, res: Response) => {
        const user = req.user as User

        const id = parseInt(req.params?.id)

        return new SuccessResponse({
            message: 'Get post by id successfully!',
            metaData: await postService.getPostById(user.id as number, id)
        }).send(res)
    }

    getAll = async (req: Request, res: Response) => {
        const user = req.user as User

        // Parse query parameters
        const query: GetAllPostsQueryReq = {
            ...req.parseQueryPagination,
            sort: req.sortParsed,
            search: req.query.search as string | undefined,
            ownerId: req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined,
            topic: req.query.topic ? (req.query.topic as PostTopic) : undefined,
            status: req.query.status ? (req.query.status as PostStatus) : undefined
        }

        const parseTags = (value: unknown): string[] | undefined => {
            if (!value) return undefined
            if (Array.isArray(value)) {
                return (value as string[]).map((t) => t.trim()).filter(Boolean)
            }
            if (typeof value === 'string') {
                return value.split(',').map((t) => t.trim()).filter(Boolean)
            }
            return undefined
        }

        const tagsFromTagsParam = parseTags(req.query.tags)
        const tagsFromTagParam = parseTags(req.query.tag)

        query.tags = tagsFromTagsParam?.length ? tagsFromTagsParam : tagsFromTagParam

        return new SuccessResponse({
            message: 'Get all posts successfully!',
            metaData: await postService.getAllPosts(user, query)
        }).send(res)
    }

    create = async (req: Request<ParamsDictionary, any, CreatePostBodyReq>, res: Response) => {
        const user = req.user as User

        return new CREATED({
            message: 'Create post successfully!',
            metaData: await postService.createPost(user.id as number, req.body)
        }).send(res)
    }

    update = async (req: Request<ParamsDictionary, any, UpdatePostBodyReq>, res: Response) => {
        const user = req.user as User

        const id = parseInt(req.params?.id)

        return new SuccessResponse({
            message: 'Update post successfully!',
            metaData: await postService.updatePost(user.id as number, id, req.body)
        }).send(res)
    }

    delete = async (req: Request<ParamsDictionary, any, any>, res: Response) => {
        const user = req.user as User

        const id = parseInt(req.params?.id)

        return new SuccessResponse({
            message: 'Delete post successfully!',
            metaData: await postService.deletePostById(user, id)
        }).send(res)
    }
}

export const postController = new PostController()
