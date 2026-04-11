import { Request, Response, NextFunction } from 'express'
import { DatabaseService } from '~/services/database.service'
import { Classroom } from '~/entities/classroom.entity'
import { ClassroomMember } from '~/entities/classroomMember.entity'
import { ForbiddenRequestError, BadRequestError } from '~/core/error.response'
import { RoleName } from '~/enums/role.enum'

/**
 * Middleware kiểm tra user có phải teacher hoặc thành viên của classroom không.
 * Admin luôn được phép qua.
 * Cần đặt sau checkIdParamMiddleware (req.params.id đã là số hợp lệ).
 */
export const isClassroomMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user!.roles?.some((r: any) => r.name === RoleName.ADMIN)
        if (isAdmin) return next()

        const classroomId = parseInt(req.params.id)
        const userId = req.user!.id

        const db = DatabaseService.getInstance()

        // Check teacher
        const classroomRepo = await db.getRepository(Classroom)
        const classroom = await classroomRepo
            .createQueryBuilder('c')
            .leftJoin('c.teacher', 'teacher')
            .addSelect(['teacher.id'])
            .where('c.id = :classroomId', { classroomId })
            .getOne()

        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })
        if (classroom.teacher?.id === userId) return next()

        // Check member
        const memberRepo = await db.getRepository(ClassroomMember)
        const member = await memberRepo.findOne({
            where: { classroom: { id: classroomId }, user: { id: userId } },
        })

        if (!member) throw new ForbiddenRequestError('You are not a member of this classroom')

        next()
    } catch (error) {
        next(error)
    }
}
