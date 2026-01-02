import { TargetType } from '../enums/targetType.enum'
import { BadRequestError } from '../core/error.response'
import { CreatePostBodyReq } from '../dtos/req/post/createPostBody.req'
import { UpdatePostBodyReq } from '../dtos/req/post/updatePostBody.req'
import { Comment } from '../entities/comment.entity'
import { Post } from '../entities/post.entity'
import { User } from '../entities/user.entity'
import { commentService } from './comment.service'
import { FindOptionsWhere, ILike, Raw } from 'typeorm'
import { Like } from '../entities/like.entity'
import { RoleName } from '../enums/role.enum'
import { GetAllPostsQueryReq } from '../dtos/req/post/getAllPostsQuery.req'
import validator from 'validator'
import { PostStatus } from '../enums/postStatus.enum'
import { PostTopic } from '../enums/postTopic.enum'

class PostService {
    getPostById = async (userId: number, id: number) => {
        const foundPost = await Post.findOne({
            where: {
                id
            },
            select: {
                id: true,
                title: true,
                content: true,
                tags: true,
                thumbnails: true,
                topic: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    avatar: true,
                    email: true
                }
            },
            relations: ['createdBy']
        })

        if (!foundPost) return {}

        const [likeCount, isAlreadyLike, commentCount] = await Promise.all([
            await this.findNumberLikeByPostId(id),
            await this.isAlreadyLike(id, userId),
            await this.findNumberCommentByPostId(id)
        ])

        //get comment with like information
        const comments = await commentService.findChildComment(id, null, TargetType.POST, userId)

        return {
            ...foundPost,
            likeCount,
            commentCount,
            isAlreadyLike,
            comments
        }
    }

    getAllPosts = async (user: User, { page = 1, limit = 10, sort, search, tags, topic, ownerId, status }: GetAllPostsQueryReq) => {
        const skip = (page - 1) * limit

        // Check if user is admin or is the owner (if ownerId is provided)
        const isAdmin = user.roles?.some(r => r.name === RoleName.ADMIN) || false
        const isOwner = ownerId && user.id === ownerId
        
        // If user is NOT admin and NOT owner, only show published posts
        const canFilterByStatus = isAdmin || isOwner
        if (!canFilterByStatus) {
            status = PostStatus.PUBLISHED
        }

        const where: FindOptionsWhere<Post> = {}

        // Always filter by status (either user-specified or forced to PUBLISHED)
        if (status) {
            where.status = status
        }

        // Filter by topic
        if (topic) {
            where.topic = topic
        }

        // Filter by tags (always filter if tag is provided, independent of search)
        if (tags && Array.isArray(tags) && tags.length > 0) {
            where.tags = Raw(
                () => `"Post"."tags"::jsonb @> :tagFilter`,
                { tagFilter: JSON.stringify(tags) }
            )
        }

        if (ownerId) {
            where.createdBy = { id: ownerId }
        }

        let finalWhere: FindOptionsWhere<Post>[] | FindOptionsWhere<Post> = where

        // Search in title and content
        if (search) {
            const normalizedSearch = validator.trim(search).toLowerCase()
            const searchConditions: FindOptionsWhere<Post>[] = []
            
            // Search in title (with all existing filters)
            searchConditions.push({
                ...where,
                title: ILike(`%${normalizedSearch}%`)
            })
            
            // Search in content (with all existing filters)
            searchConditions.push({
                ...where,
                content: ILike(`%${normalizedSearch}%`)
            })
            
            finalWhere = searchConditions
        }

        const [posts, total] = await Post.findAndCount({
            where: finalWhere,
            skip,
            take: limit,
            order: { ...sort, createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                content: true,
                tags: true,
                thumbnails: true,
                topic: true,
                createdAt: true,
                updatedAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    avatar: true
                }
            },
            relations: ['createdBy']
        })

        const data = await Promise.all(
            posts.map(async (post) => {
                const [likeCount, isAlreadyLike, commentCount] = await Promise.all([
                    this.findNumberLikeByPostId(post.id),
                    this.isAlreadyLike(post.id, user.id),
                    this.findNumberCommentByPostId(post.id)
                ])
                return {
                    ...post,
                    likeCount,
                    commentCount,
                    isAlreadyLike
                }
            })
        )

        // Get popular tags
        const popularTags = await this.getPopularTags(10)

        return {
            posts: data,
            popularTags,
            currentPage: page,
            total,
            totalPages: Math.ceil(total / limit),
        }
    }

    getPopularTags = async (limit: number = 10) => {
        // Get all posts with only tags field (to optimize query)
        const allPosts = await Post.find({
            select: {
                tags: true,
                status: true
            },
            where: {
                status: PostStatus.PUBLISHED
            }
        })

        // Flatten all tags into a single array and count frequency
        const tagCountMap = new Map<string, number>()

        allPosts.forEach((post) => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach((tag: string) => {
                    if (tag && typeof tag === 'string') {
                        const normalizedTag = tag.trim().toLowerCase()
                        if (normalizedTag) {
                            tagCountMap.set(normalizedTag, (tagCountMap.get(normalizedTag) || 0) + 1)
                        }
                    }
                })
            }
        })

        // Convert map to array, sort by count (descending), and return only tags
        const popularTags = Array.from(tagCountMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tag]) => tag)

        return popularTags
    }

    createPost = async (userId: number, {title, content, tags = [], thumbnails = [], topic }: CreatePostBodyReq) => {
        const post = new Post()
        post.createdBy = { id: userId } as User
        post.title = title
        post.content = content
        post.tags = tags
        post.thumbnails = thumbnails
        post.topic = topic

        return await post.save()
    }

    updatePost = async (userId: number, postId: number, { title, content, tags, thumbnails, topic, status }: UpdatePostBodyReq) => {
        const foundPost = await Post.findOne({
            where: {
                id: postId
            },
            select: {
                title: true,
                content: true,
                id: true,
                createdBy: {
                    id: true
                },
                thumbnails: true,
                tags: true,
                topic: true,
                status: true
            },
            relations: ['createdBy']
        })

        if (!foundPost) throw new BadRequestError({ message: 'Post not found!' })

        if(userId !== foundPost.createdBy.id) throw new BadRequestError({ message: 'User can not edit this post!' })

        //update post
        if (title) foundPost.title = title
        if (content) foundPost.content = content
        if (tags) foundPost.tags = tags
        if (thumbnails) foundPost.thumbnails = thumbnails
        if (topic) foundPost.topic = topic
        if (status) foundPost.status = status as PostStatus

        return await foundPost.save()
    }

    findNumberLikeByPostId = async (id: number) => {
        return Like.countBy({
            targetId: id,
            targetType: TargetType.POST
        })
    }

    isAlreadyLike = async (postId: number, userId: number) => {
        return Like.exists({
            where: {
                createdBy: {
                    id: userId
                },
                targetId: postId,
                targetType: TargetType.POST
            },
            relations: ['createdBy'],
            withDeleted: false
        })
    }

    findNumberCommentByPostId = async (id: number) => {
        return Comment.countBy({
            targetId: id,
            targetType: TargetType.POST
        })
    }

    deletePostById = async (user: User, id: number) => {
        const foundPost = await Post.findOne({
            where: {
                id
            },
            relations: ['createdBy']
        })
        if (!foundPost) {
            throw new BadRequestError({ message: 'Post not found!' })
        }

        const canDelete = user.roles?.some((r) => r.name === RoleName.ADMIN) || user.id === foundPost.createdBy.id

        if (!canDelete) {
            throw new BadRequestError({ message: 'User can not delete this post!' })
        }

        foundPost.status = PostStatus.DELETED
        await foundPost.save()
        await foundPost.softRemove()

        return {}
    }

    deleteCommentPost = async (userId: number, commentId: number) => {
        commentService.checkOwnComment(userId, commentId)
        return await Comment.getRepository().softDelete({
            id: commentId
        })
    }
}

export const postService = new PostService()
