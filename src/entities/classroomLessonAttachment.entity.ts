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
import { LessonAttachmentRole } from '~/enums/lessonAttachmentRole.enum'

@Entity()
export class ClassroomLessonAttachment extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @ManyToOne(() => ClassroomLesson, (lesson) => lesson.attachments, {
        onDelete: 'CASCADE',
        nullable: false,
    })
    lesson!: ClassroomLesson

    /**
     * INLINE  → phát trong app (video player / audio player)
     * DOWNLOAD → user tải về máy
     */
    @Column({ type: 'enum', enum: LessonAttachmentRole, default: LessonAttachmentRole.DOWNLOAD })
    role!: LessonAttachmentRole

    /** URL lưu trữ file (S3, Cloudinary, v.v.) */
    @Column({ type: 'text' })
    fileUrl!: string

    @Column({ type: 'enum', enum: LessonAttachmentType })
    fileType!: LessonAttachmentType

    /** Tên file gốc (hiển thị cho người học) */
    @Column({ type: 'varchar', length: 255 })
    fileName!: string

    /** MIME type đầy đủ (vd: video/mp4, application/pdf) — client dùng để quyết định renderer */
    @Column({ type: 'varchar', length: 100, nullable: true })
    mimeType?: string

    /** Kích thước file (byte) — dùng để hiển thị và validate upload */
    @Column({ type: 'bigint', nullable: true })
    fileSizeBytes?: number

    /** Thời lượng tính bằng giây — chỉ dùng cho VIDEO / AUDIO */
    @Column({ type: 'int', nullable: true })
    durationSeconds?: number

    /** Tiêu đề hiển thị thay thế fileName (tuỳ chọn) */
    @Column({ type: 'varchar', length: 255, nullable: true })
    title?: string

    /** Thứ tự hiển thị trong bài học */
    @Column({ type: 'int', default: 0 })
    sortOrder!: number

    /** Dữ liệu phụ đề dưới dạng chuỗi JSON stringified */
    @Column({ type: 'text', nullable: true })
    subtitlesJson?: string

    @CreateDateColumn()
    createdAt!: Date
}
