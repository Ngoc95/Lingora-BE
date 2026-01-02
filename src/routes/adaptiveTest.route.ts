import { Router } from 'express'
import { adaptiveTestController } from '../controllers/adaptiveTest.controller'
import { accessTokenValidation } from '../middlewares/auth.middlewares'

const adaptiveTestRouter = Router()

adaptiveTestRouter.get('/questions', adaptiveTestController.getQuestionBank)
adaptiveTestRouter.post('/next', accessTokenValidation, adaptiveTestController.getNextQuestion)

export default adaptiveTestRouter

