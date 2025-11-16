import { Request, Response } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { AdaptiveTestProgressBodyReq } from '~/dtos/req/adaptiveTest/getNextQuestionBody.req'
import { adaptiveTestService } from '~/services/adaptiveTest.service'

class AdaptiveTestController {
  getQuestionBank = async (_req: Request, res: Response) => {
    return new SuccessResponse({
      message: 'Get adaptive test question bank successfully',
      metaData: adaptiveTestService.getQuestionBank()
    }).send(res)
  }

  getNextQuestion = async (req: Request, res: Response) => {
    const { answeredQuestions = [] } = (req.body || {}) as AdaptiveTestProgressBodyReq

    const result = await adaptiveTestService.getNextQuestion({
      user: req.user!,
      answeredQuestions
    })

    return new SuccessResponse({
      message: result.isCompleted ? 'Adaptive test completed' : 'Get next adaptive test question successfully',
      metaData: result
    }).send(res)
  }
}

export const adaptiveTestController = new AdaptiveTestController()

