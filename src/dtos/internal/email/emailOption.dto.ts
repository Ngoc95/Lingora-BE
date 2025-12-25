export interface SendMailOptions {
  to: string
  subject: string
  template: string
  variables?: Record<string, any>
}
