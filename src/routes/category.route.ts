import { Router } from "express";
import { categoryController } from "../controllers/category.controller";
import { Resource } from "../enums/resource.enum";
import { accessTokenValidation, checkPermission } from "../middlewares/auth.middlewares";
import { updateCategoryValidation } from "../middlewares/category/updateCategory.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "../middlewares/common.middlewares";
import { createCategoryValidation } from "../middlewares/category/createCategory.middlewares";
import { wrapRequestHandler } from "../utils/handler";
import { Topic } from "../entities/topic.entity";

const categoryRouter = Router();

// access token validation
categoryRouter.use(accessTokenValidation)

// POST
/**
 * @description : Create a new category
 * @method : POST
 * @path : 
 * @header : Authorization
 * @body : {
 *  name: string
    description?: string
 * }
 */
categoryRouter.post(
    '',
    wrapRequestHandler(checkPermission('createAny', Resource.CATEGORY)),
    createCategoryValidation,
    wrapRequestHandler(categoryController.createCategory)
)

// GET
/**
 * @description : Get all categories for ADMIN (not for LEARNER)
 * @method : GET
 * @path : 
 * @header : Authorization
 * @query : {limit: number, page:number, search:string}
 * search for [name, description]
 */
categoryRouter.get(
    '',
    checkQueryMiddleware(),
    wrapRequestHandler(categoryController.getAllCategories)
)

// GET
/**
 * @description : Get category by id
 * @method : GET
 * @path : /:id
 * @header : Authorization
 * @params : id
 * @query : {limit: number, page:number, search:string, sort: string}
 * sort like -id,+name
 * sort field must be in ['id', 'name']
 * search?: string (search for topic.name, topic.description)
 */
categoryRouter.get(
    '/:id/topics',
    checkIdParamMiddleware,
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: Topic.allowSortList })),
    wrapRequestHandler(categoryController.getCategoryById)
)

//PATCH
/**
 * @description : Update category by id
 * @method : PATCH
 * @path : /:id
 * @header : Authorization
 * @params : id
 * @body : {
    name?: string,
    description?: string,
 * }
 */
categoryRouter.patch(
    '/:id',
    wrapRequestHandler(checkPermission('updateAny', Resource.CATEGORY)),
    checkIdParamMiddleware,
    updateCategoryValidation,
    wrapRequestHandler(categoryController.updateCategoryById)
)

//DELETE
/**
 * @description : Delete category by id
 * @method : DELETE
 * @path : /:id
 * @header : Authorization
 */
categoryRouter.delete(
    '/:id',
    wrapRequestHandler(checkPermission('deleteAny', Resource.CATEGORY)),
    checkIdParamMiddleware,
    wrapRequestHandler(categoryController.deleteCategoryById)
)

export default categoryRouter;