export enum NotificationType {
  CHANGE_PASSWORD = 'Change password',
  LIKE = 'Like',
  COMMENT = 'Comment',
  ORDER = 'Order',
  WARNING = 'Warning',
  CONTENT_DELETED = 'CONTENT_DELETED',
  WITHDRAWAL_PROCESSING = 'Withdrawal processing',
  WITHDRAWAL_COMPLETED = 'Withdrawal completed',
  WITHDRAWAL_REJECTED = 'Withdrawal rejected',
  WITHDRAWAL_FAILED = 'Withdrawal failed',
  CLASSROOM_APPROVED = 'Classroom approved',
  CLASSROOM_JOIN_REQUEST = 'Classroom join request',
  CLASSROOM_MEMBER_JOINED = 'Classroom member joined',
  CLASSROOM_NEW_LESSON = 'Classroom new lesson'
}

export enum NotificationTarget {
  ALL = 'All',
  ONLY_USER = 'Only user',
  SEGMENT = 'Segment'
}
