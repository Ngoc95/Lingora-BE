import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Word } from "./word.entity";
import { UserTopicProgress } from "./userTopicProgress.entity";
import { Category } from "./category.entity";

@Entity()
export class Topic extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({ type: "text" })
    name!: string

    @Column({ type: "text" })
    description?: string

    @OneToMany(() => Word, (word) => word.topic)
    words?: Word[]

    // foreign key
    @ManyToOne(() => Category, category => category.topics, { 
        onDelete: 'SET NULL', // xóa category → topic.category = null
        nullable: true  
    })
    category: Category | null // topic có thể ko thuộc cate nào

    @OneToMany(() => UserTopicProgress, userTopicProgress => userTopicProgress.topic, { cascade: true })
    users?: UserTopicProgress[];

    @CreateDateColumn()
    createdAt!: Date;

    static allowSortList = ['id', 'name'];
}