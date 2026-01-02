import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from '../core/success.response'
import { userService } from '../services/user.service'

class UserController {
    createUser = async (req: Request, res: Response) => {
        return new CREATED({
            message: 'Create new user successfully',
            metaData: await userService.createUser(req.body)
        }).send(res);
    }

    getAllUsers = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get page users successfully',
            metaData: await userService.getAllUsers({
                ...req.query,
                ...req.parseQueryPagination,
                sort: req.sortParsed
            })
        }).send(res)
    }

    getUserById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Get user successfully',
            metaData: await userService.getUserById(id)
        }).send(res)
    }

    updateUser = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Update user successfully',
            metaData: await userService.updateUserById(id, req.body)
        }).send(res)
    }

    restoreUser = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string)
        return new SuccessResponse({
            message: 'Restore user successfully',
            metaData: await userService.restoreUserById(id)
        }).send(res)
    }

    deleteUser = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Delete user successfully',
            metaData: await userService.deleteUserById(id)
        }).send(res)
    }
}
export const userController = new UserController()