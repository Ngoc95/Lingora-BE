import { Request, Response } from 'express'
import { uploadService } from '../services/upload.service'
import { OK, CREATED } from '../core/success.response'

class UploadController {
    getSignedUrl = async (req: Request, res: Response) => {
        const { folder } = req.query
        return new OK({
            message: 'Get signed url successfully',
            metaData: await uploadService.signUploadRequest(folder as string)
        }).send(res)
    }

    uploadImage = async (req: Request, res: Response) => {
        if (!req.file) {
            throw new Error('File not found')
        }
        return new CREATED({
            message: 'Upload image successfully',
            metaData: await uploadService.uploadImage(req.file) as object
        }).send(res)
    }

    uploadAudio = async (req: Request, res: Response) => {
        if (!req.file) {
            throw new Error('File not found')
        }
        return new CREATED({
            message: 'Upload audio successfully',
            metaData: await uploadService.uploadAudio(req.file) as object
        }).send(res)
    }
}

export const uploadController = new UploadController()
