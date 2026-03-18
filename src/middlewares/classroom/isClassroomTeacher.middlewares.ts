import { Request, Response, NextFunction } from 'express'
import { DatabaseService } from '~/services/database.service'
import { Classroom } from '~/entities/classroom.entity'
import { ForbiddenRequestError, BadRequestError } from '~/core/error.response'
import { RoleName } from '~/enums/role.enum'

/**
 * Middleware kiểm tra user có phải teacher của classroom không.
 * Admin luôn được phép qua.
 * Cần đặt sau checkIdParamMiddleware (req.params.id đã là số hợp lệ).
 */
export const isClassroomTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user!.roles?.some((r: any) => r.name === RoleName.ADMIN)
        if (isAdmin) return next()

        const classroomId = parseInt(req.params.id)
        const userId = req.user!.id

        const db = DatabaseService.getInstance()
        const classroomRepo = await db.getRepository(Classroom)

        const classroom = await classroomRepo.findOne({
            where: { id: classroomId },
            relations: ['teacher'],
        })

        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        if (classroom.teacher?.id !== userId) {
            throw new ForbiddenRequestError('You are not the teacher of this classroom')
        }

        next()
    } catch (error) {
        next(error)
    }
}
