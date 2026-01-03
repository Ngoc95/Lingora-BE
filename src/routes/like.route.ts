import { Router } from "express";
import { likeController } from "~/controllers/like.controller";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { checkParamMiddleware } from "~/middlewares/common.middlewares";
import { validateTargetType } from "~/middlewares/like/like.middlewares";
import { wrapRequestHandler } from "~/utils/handler";

const likeRouter = Router();

// access token validation
likeRouter.use(accessTokenValidation);

// POST
/**
 * @description : Like a target (post, comment, study-set, etc.)
 * @method : POST
 * @path : /likes/:targetId
 * @header : Authorization
 * @params : targetId (number)
 * @query : {
 *  targetType: TargetType (required: POST, COMMENT, STUDY_SET)
 * }
 */
likeRouter.post(
    '/:targetId',
    wrapRequestHandler(checkPermission('createOwn', Resource.LIKE)),
    checkParamMiddleware('targetId'),
    validateTargetType,
    wrapRequestHandler(likeController.like)
);

// DELETE
/**
 * @description : Unlike a target
 * @method : DELETE
 * @path : /likes/:targetId
 * @header : Authorization
 * @params : targetId (number)
 * @query : {
 *  targetType: TargetType (required: POST, COMMENT, STUDY_SET)
 * }
 */
likeRouter.delete(
    '/:targetId',
    wrapRequestHandler(checkPermission('deleteOwn', Resource.LIKE)),
    checkParamMiddleware('targetId'),
    validateTargetType,
    wrapRequestHandler(likeController.unlike)
);

export default likeRouter;
