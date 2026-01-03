import { Router } from "express"
import { translateController } from "~/controllers/translate.controller"
import { wrapRequestHandler } from "~/utils/handler"

const translateRouter = Router()

// Public phrase translation (sentence / paragraph), not dictionary
translateRouter.post(
    "/phrase",
    wrapRequestHandler(translateController.translatePhrase)
)

export default translateRouter





