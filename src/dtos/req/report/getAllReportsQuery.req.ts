import { ReportStatus } from '../../../enums/reportStatus.enum'
import { TargetType } from '../../../enums/targetType.enum'
import { ReportType } from '../../../enums/reportType.enum'
import { FindOptionsOrder } from 'typeorm'
import { Report } from '../../../entities/report.entity'

export class GetAllReportsQueryReq {
    page?: number
    limit?: number
    sort?: FindOptionsOrder<Report>
    status?: ReportStatus
    targetType?: TargetType
    reportType?: ReportType
    createdBy?: number
    search?: string  // Search by reason
}
