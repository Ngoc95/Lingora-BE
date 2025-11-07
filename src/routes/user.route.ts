import { Router } from "express";
import { userController } from "~/controllers/user.controller";
import { User } from "~/entities/user.entity";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "~/middlewares/common.middlewares";
import { createUserValidation } from "~/middlewares/user/createUser.middlewares";
import { updateUserByIdValidation } from "~/middlewares/user/updateUser.middleware";
import { wrapRequestHandler } from "~/utils/handler";

const userRouter = Router();

// access token validation
userRouter.use(accessTokenValidation)

// POST
/**
 * @description : Create a new user
 * @method : POST
 * @path : 
 * @header : Authorization
 * @body : {
 *  username: string
    email: string
    password: string
    avatar?: string (URL from upload endpoint)
    roleIds: number[]
    proficiency: string (BEGINNER, INTERMEDIATE, ADVANCED)
 * }
 */
userRouter.post(
  '',
  wrapRequestHandler(checkPermission('createAny', Resource.USER)),
  createUserValidation,
  wrapRequestHandler(userController.createUser)
)

// GET
/**
 * @description : Get all users
 * @method : GET
 * @path : 
 * @header : Authorization
 * @query : {limit: number, page:number, search:string, proficiency:ProficiencyLevel, status:UserStatus, sort: string}
 * search?: string (search for username, email)
 * sort like +id | -id
 * sort field must be in ['id', 'username', 'email', 'createdAt']
 * filter field must be in [
 *    proficiency?: ProficiencyLevel (BEGINNER, INTERMEDIATE, ADVANCED)
 *    status?: UserStatus (ACTIVE, INACTIVE, BANNED, DELETED)
 * ]
 */
userRouter.get(
  '',
  checkQueryMiddleware(),
  wrapRequestHandler(parseSort({ allowSortList: User.allowSortList })),
  wrapRequestHandler(userController.getAllUsers)
)

// GET
/**
 * @description : Get user by id
 * @method : GET
 * @path : /:id
 * @header : Authorization
 * @params : id
 */
userRouter.get('/:id', checkIdParamMiddleware, wrapRequestHandler(userController.getUserById))

//PATCH
/**
 * @description : Update user
 * @method : PATCH
 * @path : /:id
 * @header : Authorization
 * @params : id
 * @body : {
    username?: string,
    email?: string,
    newPassword?: string,
    oldPassword?: string,
    avatar?: string,
    roleIds?: number[],
    proficiency?: ProficiencyLevel, (BEGINNER, INTERMEDIATE, ADVANCED)
    status?: UserStatus (ACTIVE, INACTIVE, BANNED, DELETED)
 * }
 */
userRouter.patch(
  '/:id',
  checkIdParamMiddleware,
  updateUserByIdValidation,
  wrapRequestHandler(userController.updateUser)
)

//PATCH
/**
 * @description : Restore user from deleted
 * @method : PATCH
 * @path : /:id/restore
 * @header : Authorization
 * @params: id
 */
userRouter.patch('/restore/:id', checkIdParamMiddleware, wrapRequestHandler(userController.restoreUser))

//DELETE
/**
 * @description : Delete user by id
 * @method : DELETE
 * @path : /:id
 * @header : Authorization
 */
userRouter.delete(
  '/:id',
  wrapRequestHandler(checkPermission('deleteAny', Resource.USER)),
  checkIdParamMiddleware,
  wrapRequestHandler(userController.deleteUser)
)

export default userRouter;
