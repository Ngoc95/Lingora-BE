import { v2 as cloudinary } from 'cloudinary'
import { env } from '~/config/env'

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
})

class UploadService {
    signUploadRequest = async (folderName: string = 'lingora', uploadPreset?: string) => {
        const timestamp = Math.round(new Date().getTime() / 1000)

        const params: Record<string, string | number> = {
            timestamp,
            folder: folderName,
        }

        // Nếu có uploadPreset, đưa vào params TRƯỚC khi ký
        // (Cloudinary yêu cầu upload_preset phải nằm trong signature với signed upload)
        if (uploadPreset) {
            params.upload_preset = uploadPreset
        }

        const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET)

        return {
            signature,
            timestamp,
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            apiKey: env.CLOUDINARY_API_KEY,
            folder: folderName,
            ...(uploadPreset ? { uploadPreset } : {}),
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
    
    uploadFile = async (file: Express.Multer.File, folderName: string = 'lingora/files') => {
        return new Promise<{ url: string; name: string; size: number; mimeType: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'raw',
                    use_filename: true,
                    unique_filename: true,
                },
                (error, result) => {
                    if (error || !result) return reject(error)
                    resolve({
                        url: result.secure_url,
                        name: file.originalname,
                        size: file.size,
                        mimeType: file.mimetype,
                    })
                }
            )
            uploadStream.end(file.buffer)
        })
    }
}

export const uploadService = new UploadService()
