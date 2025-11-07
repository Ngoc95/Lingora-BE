import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from "~/core/success.response";
import { topicService } from '~/services/topic.service';

class TopicController {
    createTopic = async (req: Request, res: Response) => {
        return new CREATED({
            message: 'Create new topic successfully',
            metaData: await topicService.createTopic(req.body)
        }).send(res);
    }

    getAllTopics = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get all topics successfully',
            metaData: await topicService.getAllTopics({
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
                sort: req.sortParsed
            })
        }).send(res)
    }

    getTopicById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Get topic and its words successfully',
            metaData: await topicService.getTopicById(id, {
                ...req.query,
                ...req.parseQueryPagination,
                sort: req.sortParsed
            })
        }).send(res)
    }

    updateTopicById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Update topic successfully',
            metaData: await topicService.updateTopicById(id, req.body)
        }).send(res)
    }

    deleteTopicById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Delete topic successfully',
            metaData: await topicService.deleteTopicById(id)
        }).send(res)
    }
}

export const topicController = new TopicController()