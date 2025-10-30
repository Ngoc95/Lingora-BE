import { Request, Response } from 'express'
import { CREATED } from "~/core/success.response"
import { userService } from "~/services/user.service";

class UserController {
    createUser = async (req: Request, res: Response) => {
        return new CREATED({
            message: 'Create new user successfully!',
            metaData: await userService.createUser(req.body)
        }).send(res);
    }
}
export const userController = new UserController()