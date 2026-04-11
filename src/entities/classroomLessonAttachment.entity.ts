import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'
import { ClassroomLesson } from './classroomLesson.entity'
import { LessonAttachmentType } from '~/enums/lessonAttachmentType.enum'

@Entity()
export class ClassroomLessonAttachment extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => ClassroomLesson, (lesson) => lesson.attachments, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    lesson!: ClassroomLesson

    /** URL lưu trữ file (S3, Cloudinary, v.v.) */
    @Column({ type: 'text' })
    fileUrl!: string

    @Column({ type: 'enum', enum: LessonAttachmentType })
    fileType!: LessonAttachmentType

    /** Tên file gốc (hiển thị cho người học) */
    @Column({ type: 'varchar', length: 255 })
    fileName!: string

    /** Kích thước file (byte) — dùng để hiển thị và validate upload */
    @Column({ type: 'bigint', nullable: true })
    fileSizeBytes?: number

    /** Thứ tự hiển thị trong bài học */
    @Column({ type: 'int', default: 0 })
    sortOrder!: number

    @CreateDateColumn()
    createdAt!: Date
}
