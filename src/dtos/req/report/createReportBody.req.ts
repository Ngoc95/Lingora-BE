import { TargetType } from '~/enums/targetType.enum'
import { ReportType } from '~/enums/reportType.enum'

export class CreateReportBodyReq {
    targetType: TargetType
    targetId: number
    reportType: ReportType
    reason: string
}
