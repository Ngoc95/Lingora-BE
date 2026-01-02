import { Router } from "express";
import { postController } from "../controllers/post.controller";
import { Post } from "../entities/post.entity";
import { Resource } from "../enums/resource.enum";
import { accessTokenValidation, checkPermission } from "../middlewares/auth.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "../middlewares/common.middlewares";
import { createPostValidation } from "../middlewares/post/createPost.middlewares";
import { updatePostValidation } from "../middlewares/post/updatePost.middlewares";
import { wrapRequestHandler } from "../utils/handler";

const postRouter = Router();

// access token validation
postRouter.use(accessTokenValidation);

// POST
/**
 * @description : Create a new post
 * @method : POST
 * @path : /posts
 * @header : Authorization
 * @body : {
 *  title: string (1-128 chars)
 *  content: string (required)
 *  thumbnails?: string[] (array of image URLs)
 *  tags?: string[] (array of tag strings)
 * }
 */
postRouter.post(
    '',
    wrapRequestHandler(checkPermission('createOwn', Resource.POST)),
    createPostValidation,
    wrapRequestHandler(postController.create)
);

// GET
/**
 * @description : Get all posts
 * @method : GET
 * @path : /posts
 * @header : Authorization
 * @query : {
 *  page?: number (default: 1)
 *  limit?: number
 *  sort?: string (e.g., "-createdAt" or "+createdAt")
 *  search?: string (search in title and content)
 *  ownerId?: number (filter by owner)
 *  topic?: PostTopic (filter by topic) (general, vocabulary, grammar, listening, speaking, reading, writing)
 *  tags?: string[] (filter by tags)
 *  status?: PostStatus (published, archived, deleted)
 * }
 * Note: Only admin or owner can filter by status. Others only see PUBLISHED posts.
 */
postRouter.get(
    '',
    checkQueryMiddleware({
        numbericFields: ['ownerId'],
    }),
    wrapRequestHandler(parseSort({ allowSortList: Post.allowSortList })),
    wrapRequestHandler(postController.getAll)
);

// GET
/**
 * @description : Get post by id
 * @method : GET
 * @path : /posts/:id
 * @header : Authorization
 * @params : id (number)
 */
postRouter.get(
    '/:id',
    checkIdParamMiddleware,
    wrapRequestHandler(postController.getById)
);

// PATCH
/**
 * @description : Update post by id
 * @method : PATCH
 * @path : /posts/:id
 * @header : Authorization
 * @params : id (number)
 * @body : {
 *  title?: string (1-128 chars)
 *  content?: string
 *  thumbnails?: string[] (array of image URLs)
 *  tags?: string[] (array of tag strings)
 *  status?: PostStatus (PUBLISHED, ARCHIVED, DELETED)
 * }
 * Note: Only owner can update their own post
 */
postRouter.patch(
    '/:id',
    wrapRequestHandler(checkPermission('updateOwn', Resource.POST)),
    checkIdParamMiddleware,
    updatePostValidation,
    wrapRequestHandler(postController.update)
);

// DELETE
/**
 * @description : Delete post by id
 * @method : DELETE
 * @path : /posts/:id
 * @header : Authorization
 * @params : id (number)
 * Note: Only admin or owner can delete post
 */
postRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteOwn', Resource.POST)),
    checkIdParamMiddleware,
    wrapRequestHandler(postController.delete)
);

export default postRouter;
