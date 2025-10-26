import { Response } from 'express'

export class SuccessResponse {
  message: string
  statusCode: number
  metaData: object

  constructor({
    message = 'Success response',
    statusCode = 200,
    metaData = {}
  }: {
    message?: string
    statusCode?: number
    metaData?: object
  }) {
    this.message = message
    this.statusCode = statusCode
    this.metaData = metaData
  }

  send(res: Response) {
    res.status(this.statusCode).json(this)
  }
}

export class CREATED extends SuccessResponse {
  constructor({ message = 'Created', metaData = {} }: { message?: string; metaData?: object; options?: object }) {
    super({
      message,
      statusCode: 201,
      metaData
    })
  }
}
