import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env'

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
})

class UploadService {
    signUploadRequest = async (folderName: string = 'lingora') => {
        const timestamp = Math.round(new Date().getTime() / 1000)

        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: folderName
            },
            env.CLOUDINARY_API_SECRET
        )

        return {
            signature,
            timestamp,
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            apiKey: env.CLOUDINARY_API_KEY,
            folder: folderName
        }
    }

    uploadImage = async (file: Express.Multer.File, folderName: string = 'lingora/images') => {
        // This method is for server-side upload if needed
        // But for signed request flow, client uploads directly
        // Keeping this as utility if server needs to upload
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'image'
                },
                (error, result) => {
                    if (error) return reject(error)
                    resolve(result)
                }
            )
            uploadStream.end(file.buffer)
        })
    }

    uploadAudio = async (file: Express.Multer.File, folderName: string = 'lingora/audios') => {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'video' // Cloudinary treats audio as video
                },
                (error, result) => {
                    if (error) return reject(error)
                    resolve(result)
                }
            )
            uploadStream.end(file.buffer)
        })
    }
}

export const uploadService = new UploadService()
