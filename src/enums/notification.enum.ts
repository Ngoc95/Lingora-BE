export enum NotificationType {
  CHANGE_PASSWORD = 'Change password',
  LIKE = 'Like',
  COMMENT = 'Comment',
  ORDER = 'Order',
  WARNING = 'Warning',
  CONTENT_DELETED = 'CONTENT_DELETED'
}

export enum NotificationTarget {
  ALL = 'All',
  ONLY_USER = 'Only user',
  SEGMENT = 'Segment'
}
