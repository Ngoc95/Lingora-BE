import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'
import { User } from './user.entity'
import { PostStatus } from '~/enums/postStatus.enum'
import { PostTopic } from '~/enums/postTopic.enum'

@Entity()
export class Post extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 150 })
    title: string

    @Column('text')
    content: string

    @Column({
        type: 'enum',
        enum: PostTopic,
        default: PostTopic.GENERAL
    })
    topic!: PostTopic

    @Column('json')
    thumbnails: string[]

    @Column('json')
    tags: string[]

    @Column({
        type: 'enum',
        enum: PostStatus,
        default: PostStatus.PUBLISHED
    })
    status!: PostStatus

    @ManyToOne(() => User)
    createdBy: User

    @DeleteDateColumn()
    deletedAt?: Date

    @CreateDateColumn()
    createdAt?: Date

    @UpdateDateColumn()
    updatedAt?: Date

    static allowSortList = ['createdAt']
}
