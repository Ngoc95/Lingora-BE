import { Router } from "express";
import { commentController } from "~/controllers/comment.controller";
import { BadRequestError } from "~/core/error.response";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { checkParamMiddleware } from "~/middlewares/common.middlewares";
import { createCommentValidation } from "~/middlewares/comment/createComment.middlewares";
import { updateCommentValidation } from "~/middlewares/comment/updateComment.middlewares";
import { wrapRequestHandler } from "~/utils/handler";
import { isValidNumber } from "~/utils";

const commentRouter = Router();

// access token validation
commentRouter.use(accessTokenValidation);

// GET
/**
 * @description : Get child comments of a target
 * @method : GET
 * @path : /comments/target/:targetId/parent/:parentId
 * @header : Authorization
 * @params : {
 *  targetId: number (ID of post/comment/study-set)
 *  parentId: number | 'null' (ID of parent comment, use 'null' for top-level comments)
 * }
 * @query : {
 *  targetType?: TargetType (POST, COMMENT, STUDY_SET, default: POST)
 * }
 * Note: parentId can be 'null' string for top-level comments
 */
commentRouter.get(
    '/target/:targetId/parent/:parentId',
    checkParamMiddleware('targetId'),
    wrapRequestHandler((req, res, next) => {
        // parentId can be 'null' string or number
        if (req.params?.parentId && req.params.parentId !== 'null' && !isValidNumber(req.params.parentId)) {
            throw new BadRequestError({ message: 'Parent ID must be a valid number or "null"' });
        }
        next();
    }),
    wrapRequestHandler(commentController.getChildComment)
);

// POST
/**
 * @description : Create a new comment
 * @method : POST
 * @path : /comments/target/:targetId
 * @header : Authorization
 * @params : targetId (number)
 * @query : {
 *  targetType?: TargetType (POST, COMMENT, STUDY_SET, default: POST)
 * }
 * @body : {
 *  content: string (1-256 chars, required)
 *  parentId?: number | null (ID of parent comment, null for top-level comment)
 * }
 */
commentRouter.post(
    '/target/:targetId',
    wrapRequestHandler(checkPermission('createOwn', Resource.COMMENT)),
    checkParamMiddleware('targetId'),
    createCommentValidation,
    wrapRequestHandler(commentController.createComment)
);

// PATCH
/**
 * @description : Update comment by id
 * @method : PATCH
 * @path : /comments/:commentId/target/:targetId
 * @header : Authorization
 * @params : {
 *  commentId: number
 *  targetId: number
 * }
 * @query : {
 *  targetType?: TargetType (POST, COMMENT, STUDY_SET, default: POST)
 * }
 * @body : {
 *  content: string (1-256 chars, required)
 * }
 * Note: Only owner can update their own comment
 */
commentRouter.patch(
    '/:commentId/target/:targetId',
    wrapRequestHandler(checkPermission('updateOwn', Resource.COMMENT)),
    checkParamMiddleware('commentId'),
    checkParamMiddleware('targetId'),
    updateCommentValidation,
    wrapRequestHandler(commentController.updateComment)
);

// DELETE
/**
 * @description : Delete comment by id
 * @method : DELETE
 * @path : /comments/:commentId
 * @header : Authorization
 * @params : commentId (number)
 * Note: Only owner can delete their own comment
 */
commentRouter.delete(
    '/:commentId',
    wrapRequestHandler(checkPermission('deleteOwn', Resource.COMMENT)),
    checkParamMiddleware('commentId'),
    wrapRequestHandler(commentController.deleteComment)
);

export default commentRouter;
