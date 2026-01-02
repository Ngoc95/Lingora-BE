import { ReportStatus } from '../../../enums/reportStatus.enum'
import { ReportActionType } from '../../../enums/reportActionType.enum'

export class ReportAction {
    type: ReportActionType
    reason?: string
    duration?: number  // For SUSPEND_USER (days)
}

export class HandleReportBodyReq {
    status: ReportStatus
    actions?: ReportAction[] // array to support multiple actions
}
