import { Router } from 'express'
import { uploadController } from '~/controllers/upload.controller'
import { accessTokenValidation } from '~/middlewares/auth.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import multer from 'multer'

const uploadRouter = Router()
const upload = multer({ storage: multer.memoryStorage() })

uploadRouter.use(accessTokenValidation)

/**
 * @description : Get signed url for upload
 * @method : GET
 * @path : /upload/signed-url
 * @query : {
 *   folder: string (optional, default: 'lingora')
 * }
 */
uploadRouter.get('/signed-url', wrapRequestHandler(uploadController.getSignedUrl))

/**
 * @description : Upload image to server (then cloud)
 * @method : POST
 * @path : /upload/image
 * @body : form-data { file: image }
 */
uploadRouter.post(
    '/image',
    upload.single('file'),
    wrapRequestHandler(uploadController.uploadImage)
)

/**
 * @description : Upload audio to server (then cloud)
 * @method : POST
 * @path : /upload/audio
 * @body : form-data { file: audio }
 */
uploadRouter.post(
    '/audio',
    upload.single('file'),
    wrapRequestHandler(uploadController.uploadAudio)
)

export default uploadRouter
