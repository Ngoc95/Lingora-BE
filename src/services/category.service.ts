import { CreateCategoryBodyReq } from "~/dtos/req/category/createCategoryBody.req"
import { UpdateCategoryBodyReq } from "~/dtos/req/category/updateCategoryBody.req"
import { DatabaseService } from "./database.service"
import { Category } from "~/entities/category.entity"
import { BadRequestError } from "~/core/error.response"
import { GetAllCategoriesQueryReq } from "~/dtos/req/category/getAllCategoriesQuery.req"
import validator from "validator"
import { GetCategoryQueryReq } from "~/dtos/req/category/getCategoryQuery.req"
import { Topic } from "~/entities/topic.entity"
import { FindOptionsWhere, ILike } from "typeorm"
import { Word } from "~/entities/word.entity"

class CategoryService {
    private db = DatabaseService.getInstance()

    createCategory = async ({ name, description }: CreateCategoryBodyReq) => {
        const categoryRepo = await this.db.getRepository(Category)
        const existing = await categoryRepo.findOne({ where: { name } })
        if (existing) throw new BadRequestError({ message: 'Category name already exists' })

        const category = categoryRepo.create({ name, description })
        await categoryRepo.save(category)

        return category
    }

    getAllCategories = async ({ page = 1, limit = 20, search }: GetAllCategoriesQueryReq) => {
        const categoryRepo = await this.db.getRepository(Category)
        const skip = (page - 1) * limit

        // === Xây where điều kiện tìm kiếm ===
        const qb = categoryRepo
            .createQueryBuilder('category')
            .leftJoin('category.topics', 'topic')
            .loadRelationCountAndMap('category.totalTopics', 'category.topics') // Đếm số topic -> thêm totalTopics vào qb
            .orderBy('category.id', 'ASC')
            .skip(skip)
            .take(limit)
            .select([
                'category.id',
                'category.name',
                'category.description',
            ])

        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            qb.where('LOWER(category.name) ILIKE :search OR LOWER(category.description) ILIKE :search', {
                search: `%${normalized}%`,
            })
        }

        // === Truy vấn ===
        const [categories, total] = await qb.getManyAndCount()

        // === Trả kết quả ===
        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            categories,
        }
    }

    getCategoryById = async (
        id: number,
        { page = 1, limit = 20, search, sort }: GetCategoryQueryReq
    ) => {
        const skip = (page - 1) * limit

        const categoryRepo = await this.db.getRepository(Category)
        const topicRepo = await this.db.getRepository(Topic)
        const wordRepo = await this.db.getRepository(Word)

        // === Kiểm tra category có tồn tại không ===
        const category = await categoryRepo.findOne({ where: { id } })
        if (!category) throw new BadRequestError({ message: 'Category not found' })

        // === Tạo điều kiện where ===
        let where: FindOptionsWhere<Topic>[] | FindOptionsWhere<Topic> = [
            {
                category: { id }, // chỉ lấy topic thuộc category này
            },
        ]

        // Nếu có search
        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            where = [
                { category: { id }, name: ILike(`%${normalized}%`) },
                { category: { id }, description: ILike(`%${normalized}%`) },
            ]
        }

        // Sort mặc định
        if (!sort) sort = { id: 'ASC' as const }

        // === Query topic ===
        const [topics, totalTopics] = await topicRepo.findAndCount({
            skip,
            take: limit,
            where: where,
            order: sort,
        })

        // === Lấy totalWords cho từng topic ===
        const topicsWithCount = await Promise.all(
            topics.map(async (topic) => {
                const totalWords = await wordRepo.count({ where: { topic: { id: topic.id } } })
                return { ...topic, totalWords }
            })
        )

        // === Trả kết quả ===
        return {
            id: category.id,
            name: category.name,
            description: category.description,
            totalTopics,
            currentPage: page,
            totalPages: Math.ceil(totalTopics / limit),
            topics: topicsWithCount,
        }
    }

    updateCategoryById = async (
        id: number,
        { name, description }: UpdateCategoryBodyReq
    ) => {
        const categoryRepo = await this.db.getRepository(Category)
        const category = await categoryRepo.findOne({ where: { id } })
        if (!category) throw new BadRequestError({ message: 'Category not found' })

        if (name) category.name = name
        if (description !== undefined) category.description = description

        await categoryRepo.save(category)
        return category
    }

    deleteCategoryById = async (id: number) => {
        const categoryRepo = await this.db.getRepository(Category)
        const result = await categoryRepo.delete(id)

        if (result.affected === 0) {
            throw new BadRequestError({ message: 'Category not found' })
        }

        return result
    }
}
export const categoryService = new CategoryService()