import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from '~/core/success.response'
import { categoryService } from '~/services/category.service'

class CategoryController {
    createCategory = async (req: Request, res: Response) => {
        return new CREATED({
            message: 'Create new category successfully',
            metaData: await categoryService.createCategory(req.body)
        }).send(res);
    }

    getAllCategories = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get all categories successfully',
            metaData: await categoryService.getAllCategories({
                ...req.query,
                ...req.parseQueryPagination,
            })
        }).send(res)
    }

    getCategoryById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Get category successfully',
            metaData: await categoryService.getCategoryById(id, {
                ...req.query,
                ...req.parseQueryPagination,
                sort: req.sortParsed
            })
        }).send(res)
    }

    updateCategoryById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Update category successfully',
            metaData: await categoryService.updateCategoryById(id, req.body)
        }).send(res)
    }

    deleteCategoryById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Delete category successfully',
            metaData: await categoryService.deleteCategoryById(id)
        }).send(res)
    }
}

export const categoryController = new CategoryController()