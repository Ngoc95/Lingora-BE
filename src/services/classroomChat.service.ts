import { DatabaseService } from './database.service'
import { ClassroomMessage } from '~/entities/classroomMessage.entity'
import { ClassroomMember } from '~/entities/classroomMember.entity'
import { Classroom } from '~/entities/classroom.entity'
import { ClassroomMessageType } from '~/enums/classroomMessageType.enum'
import eventBus from '~/events-handler/eventBus'
import { EVENTS } from '~/events-handler/constants'

class ClassroomChatService {
    private db = DatabaseService.getInstance()

    /**
     * Lấy lịch sử chat có cursor-based pagination.
     * @param beforeId  — chỉ lấy messages có id < beforeId (để load more)
     */
    getChatHistory = async (classroomId: number, limit = 50, beforeId?: number) => {
        const msgRepo = await this.db.getRepository(ClassroomMessage)

        const qb = msgRepo
            .createQueryBuilder('msg')
            .leftJoin('msg.sender', 'sender')
            .addSelect(['sender.id', 'sender.username', 'sender.avatar'])
            .leftJoinAndSelect('msg.repliedTo', 'repliedTo')
            .where('msg.classroomId = :classroomId', { classroomId })
            .orderBy('msg.id', 'DESC')
            .take(limit)

        if (beforeId) {
            qb.andWhere('msg.id < :beforeId', { beforeId })
        }

        const messages = await qb.getMany()
        // Trả về ASC cho FE (newest at bottom)
        return messages.reverse()
    }

    /**
     * Kiểm tra user có phải thành viên/teacher của classroom không.
     */
    isMember = async (classroomId: number, userId: number): Promise<boolean> => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const classroom = await classroomRepo
            .createQueryBuilder('c')
            .leftJoin('c.teacher', 'teacher')
            .addSelect(['teacher.id'])
            .where('c.id = :classroomId', { classroomId })
            .getOne()

        if (!classroom) return false
        if (classroom.teacher?.id === userId) return true

        const memberRepo = await this.db.getRepository(ClassroomMember)
        const member = await memberRepo.findOne({
            where: { classroom: { id: classroomId }, user: { id: userId } },
        })
        return !!member
    }

    /**
     * Lưu tin nhắn vào DB và trả về object đầy đủ (kèm sender).
     */
    saveMessage = async (
        classroomId: number,
        senderId: number,
        content: string,
        type: ClassroomMessageType = ClassroomMessageType.TEXT,
        attachmentUrl?: string,
        repliedToId?: number,
    ) => {
        const msgRepo = await this.db.getRepository(ClassroomMessage)

        const msg = msgRepo.create({
            classroom: { id: classroomId } as any,
            sender: { id: senderId } as any,
            content,
            type,
            attachmentUrl,
            ...(repliedToId ? { repliedTo: { id: repliedToId } as any } : {}),
        })
        await msgRepo.save(msg)

        // Reload với sender + repliedTo
        const saved = await msgRepo
            .createQueryBuilder('msg')
            .leftJoin('msg.sender', 'sender')
            .addSelect(['sender.id', 'sender.username', 'sender.avatar'])
            .leftJoinAndSelect('msg.repliedTo', 'repliedTo')
            .where('msg.id = :id', { id: msg.id })
            .getOne()

        // Award XP for being active in classroom chat. Capped daily to
        // prevent spam (see DAILY_XP_CAPS.CLASSROOM_CHAT).
        eventBus.emit(EVENTS.CLASSROOM_CHAT_SENT, {
            userId: senderId,
            classroomId,
            referencedId: msg.id
        })

        return saved!
    }
}

export const classroomChatService = new ClassroomChatService()
