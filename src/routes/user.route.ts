import { Router } from "express";
import { userController } from "~/controllers/user.controller";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { createUserValidation } from "~/middlewares/user/createUser.middlewares";
import { wrapRequestHandler } from "~/utils/handler";

const userRouter = Router();

// access token validation
userRouter.use(accessTokenValidation)

//POST
/**
 * @description : Create a new user
 * @method : POST
 * @path : /
 * @header : Authorization
 * @body : {
 *  username: string
    email: string
    password: string
    avatar?: string (URL from upload endpoint)
    rolesId: number[]
    proficiency: string (BEGINNER, INTERMEDIATE, ADVANCED)
 * }
 */
userRouter.post(
  '/',
  wrapRequestHandler(checkPermission('createAny', Resource.USER)),
  createUserValidation,                          
  wrapRequestHandler(userController.createUser)      
)


export default userRouter;
