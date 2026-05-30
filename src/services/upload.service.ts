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
        return new Promise<{ url: string; name: string; size: number; mimeType: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'image'
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

    uploadAudio = async (file: Express.Multer.File, folderName: string = 'lingora/audios') => {
        return new Promise<{ url: string; name: string; size: number; mimeType: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'video' // Cloudinary treats audio as video
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
    
    uploadFile = async (file: Express.Multer.File, folderName: string = 'lingora/files') => {
        return new Promise<{ url: string; name: string; size: number; mimeType: string }>((resolve, reject) => {
            const originalName = file.originalname || 'file';
            const lastDotIndex = originalName.lastIndexOf('.');
            const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';
            const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;

            // Chuẩn hóa và làm sạch tên file để làm publicId an toàn trong URL
            const safeBaseName = baseName
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu Tiếng Việt
                .replace(/[^a-zA-Z0-9_-]/g, '_')  // Thay thế ký tự đặc biệt bằng _
                .substring(0, 80);

            const uniqueSuffix = Math.round(new Date().getTime() / 1000) + '_' + Math.round(Math.random() * 1000);
            const publicId = `${safeBaseName}_${uniqueSuffix}${ext}`;

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    public_id: publicId,
                    resource_type: 'raw',
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
