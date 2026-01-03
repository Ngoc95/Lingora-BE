import { BaseEntity, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { TargetType } from "~/enums/targetType.enum";
import { ReportStatus } from "~/enums/reportStatus.enum";
import { ReportType } from "~/enums/reportType.enum";

@Entity()
export class Report extends BaseEntity {
  @PrimaryGeneratedColumn()
  id?: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy: User

  @Column({
    type: 'enum',
    enum: TargetType,
    default: TargetType.POST
  })
  targetType: TargetType

  @Column('int')
  targetId: number

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.OTHER
  })
  reportType: ReportType

  @Column('varchar')
  reason: string

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING
  })
  status: ReportStatus

  @CreateDateColumn()
  createdAt?: Date

}
