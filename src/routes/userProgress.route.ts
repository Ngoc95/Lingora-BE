import { Router } from "express";
import { userProgressController } from "~/controllers/userProgress.controller"
import { accessTokenValidation } from "~/middlewares/auth.middlewares";
import { getTopicProgressValidation } from "~/middlewares/userProgress/getTopicProgress.middlewares";
import { createWordProgressValidation } from "~/middlewares/userProgress/createWordProgress.middlewares"
import { updateWordProgressValidation } from "~/middlewares/userProgress/updateWordProgress.middlewares"
import { wrapRequestHandler } from "~/utils/handler"
import { getCategoryProgressValidation } from "~/middlewares/userProgress/getCategoryProgress.middlewares";

const userProgressRouter = Router()

userProgressRouter.use(accessTokenValidation)

//POST
/**
 * @description : Create word progress
 * @method : POST
 * @path : /
 * @header : Authorization
 * @query : wordIds: number[]
 */
userProgressRouter.post(
  '/',
  createWordProgressValidation,
  wrapRequestHandler(userProgressController.createManyWordProgress)
)

//PUT
/**
 * @description : Update word progress
 * @method : PUT
 * @path : /word
 * @header : Authorization
 * @query : wordProgress: [
 *   {
 *     wordId: number,
 *     wrongCount: number,
 *     reviewedDate: Date
 *   }
 * ]
 */
userProgressRouter.put(
  '/',
  updateWordProgressValidation,
  wrapRequestHandler(userProgressController.updateManyWordProgress)
)

// GET
/**
 * @description : Get topic progress by topicId
 * @method : GET
 * @path : /topic/:id
 * @header : Authorization
 * @params : id
 */
userProgressRouter.get(
  '/topic/:id',
  getTopicProgressValidation,
  wrapRequestHandler(userProgressController.getTopicProgress)
)

// GET
/**
 * @description : Get category progress by categoryId
 * @method : GET
 * @path : /category/:id
 * @header : Authorization
 * @params : id
 */
userProgressRouter.get(
  '/category/:id',
  getCategoryProgressValidation,
  wrapRequestHandler(userProgressController.getCategoryProgress)
)

export default userProgressRouter;