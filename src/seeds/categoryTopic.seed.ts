import { faker } from '@faker-js/faker'
import { Category } from '~/entities/category.entity'
import { Topic } from '~/entities/topic.entity'
import { DatabaseService } from '~/services/database.service'

export async function seedCategoriesAndTopics() {
  const db = DatabaseService.getInstance()
  await db.connect()
  const dataSource = db.dataSource
  const categoryRepo = dataSource.getRepository(Category)
  const topicRepo = dataSource.getRepository(Topic)

  const existingCategories = await categoryRepo.count()
  if (existingCategories > 0) {
    console.log('ℹ️ Categories and topics already exist, skipping seed...')
    return
  }

  console.log('🌱 Creating categories & topics...')

  // 1️⃣ Danh sách 3 categories cố định với 8 topics
  const fixedCategories = [
    {
      name: 'Everyday English',
      description: 'Common words used in daily conversations',
      topics: [
        { name: 'Greetings', description: 'Basic greetings and introductions' },
        { name: 'Food & Drinks', description: 'Common foods, meals and drinks' },
        { name: 'Shopping', description: 'Phrases and vocabulary for shopping' },
      ],
    },
    {
      name: 'Travel & Transport',
      description: 'Words and phrases used when travelling',
      topics: [
        { name: 'Airports', description: 'Travel vocabulary related to flying' },
        { name: 'Hotels', description: 'Vocabulary about staying in hotels' },
        { name: 'Directions', description: 'Asking and giving directions' },
      ],
    },
    {
      name: 'Work & Education',
      description: 'Office, job, and school-related vocabulary',
      topics: [
        { name: 'Jobs', description: 'Common professions and workplace terms' },
        { name: 'School Life', description: 'Words about study, teachers, exams' },
      ],
    },
  ]

  // Đếm số topics đã có
  const fixedTopicsCount = fixedCategories.reduce((sum, cat) => sum + cat.topics.length, 0)
  console.log(`📌 Fixed topics: ${fixedTopicsCount}`)

  // Tính toán cần thêm bao nhiêu topics để đạt 83
  const targetTopicsCount = 83
  const remainingTopics = targetTopicsCount - fixedTopicsCount // 83 - 8 = 75

  // 2️⃣ Sinh categories ngẫu nhiên với tổng 75 topics
  const fakedCategories: Array<{
    name: string
    description: string
    topics: Array<{ name: string; description: string }>
  }> = []

  let generatedTopicsCount = 0

  while (generatedTopicsCount < remainingTopics) {
    // Mỗi category có 3-6 topics
    const topicsPerCategory = Math.min(
      faker.number.int({ min: 3, max: 6 }),
      remainingTopics - generatedTopicsCount
    )

    fakedCategories.push({
      name: `${faker.word.adjective()} ${faker.word.noun()}`,
      description: faker.lorem.sentence(),
      topics: Array.from({ length: topicsPerCategory }, () => ({
        name: `${faker.word.adjective()} ${faker.word.noun()}`,
        description: faker.lorem.sentence(),
      })),
    })

    generatedTopicsCount += topicsPerCategory
  }

  console.log(`🎲 Generated ${fakedCategories.length} random categories with ${generatedTopicsCount} topics`)

  // 3️⃣ Gộp 2 danh sách lại
  const allCategories = [...fixedCategories, ...fakedCategories]

  // 4️⃣ Lưu vào DB (Category -> Topics one-to-many)
  let totalTopics = 0
  const topicNames = new Set<string>() // Track để tránh trùng

  for (const [index, catData] of allCategories.entries()) {
    // Tạo category trước
    const category = categoryRepo.create({
      name: catData.name,
      description: catData.description,
    })
    await categoryRepo.save(category)

    // Tạo topics thuộc category này
    for (const topicData of catData.topics) {
      // Đảm bảo tên topic unique
      let topicName = topicData.name
      let counter = 1
      while (topicNames.has(topicName.toLowerCase())) {
        topicName = `${topicData.name} ${counter}`
        counter++
      }
      topicNames.add(topicName.toLowerCase())

      // Tạo topic với reference đến category (one-to-many)
      const topic = topicRepo.create({
        name: topicName,
        description: topicData.description,
        category, // Link topic -> category
      })
      await topicRepo.save(topic)
      totalTopics++
    }

    // Log progress
    if ((index + 1) % 5 === 0 || index < 3) {
      console.log(`✅ Created category ${index + 1}/${allCategories.length}: ${catData.name} (${catData.topics.length} topics)`)
    }
  }

  console.log(`\n${'🎉'.repeat(30)}`)
  console.log(`✅ Seeded categories & topics successfully!`)
  console.log(`   📦 Total categories: ${allCategories.length}`)
  console.log(`   📌 Fixed categories: 3 (with ${fixedTopicsCount} topics)`)
  console.log(`   🎲 Random categories: ${fakedCategories.length} (with ${generatedTopicsCount} topics)`)
  console.log(`   🎯 Total topics created: ${totalTopics}`)
  console.log('🎉'.repeat(30))
}

// export async function seedCategoriesAndTopics() {
//   const db = DatabaseService.getInstance()
//   await db.connect()
//   const dataSource = db.dataSource

//   const categoryRepo = dataSource.getRepository(Category)
//   const topicRepo = dataSource.getRepository(Topic)
//   const categoryTopicRepo = dataSource.getRepository(CategoryTopic)

//   // const existingCategories = await categoryRepo.count()
//   // if (existingCategories > 0) {
//   //   console.log('ℹ️ Categories and topics already exist, skipping seed...')
//   //   return
//   // }

//   console.log('🌱 Creating categories & topics...')

//   // 🧠 Sinh ngẫu nhiên 20 categories
//   const categoriesData = Array.from({ length: 20 }, (_) => ({
//     name: `${faker.word.adjective()} ${faker.word.noun()}`,
//     description: faker.lorem.sentence(),
//     topics: Array.from(
//       { length: faker.number.int({ min: 4, max: 8 }) },
//       (_) => ({
//         name: `${faker.word.noun()}`,
//         description: faker.lorem.sentence(),
//       })
//     ),
//   }))

//   // 💾 Lưu vào DB
//   for (const cat of categoriesData) {
//     const category = categoryRepo.create({
//       name: cat.name,
//       description: cat.description,
//     })
//     await categoryRepo.save(category)

//     for (const topicData of cat.topics) {
//       // Kiểm tra trùng tên (nếu cần)
//       let topic = await topicRepo.findOne({ where: { name: topicData.name } })
//       if (!topic) {
//         topic = topicRepo.create({
//           name: topicData.name,
//           description: topicData.description,
//         })
//         await topicRepo.save(topic)
//       }

//       // Liên kết Category - Topic
//       const catTopic = categoryTopicRepo.create({
//         category,
//         topic,
//       })
//       await categoryTopicRepo.save(catTopic)
//     }
//   }

//   console.log('✅ Seeded 20 categories & topics successfully!')
// }
// seedCategoriesAndTopics()



// export async function seedCategoriesAndTopics() {
//   const db = DatabaseService.getInstance()
//   await db.connect()
//   const dataSource = db.dataSource
//   const categoryRepo = dataSource.getRepository(Category)
//   const topicRepo = dataSource.getRepository(Topic)
//   const categoryTopicRepo = dataSource.getRepository(CategoryTopic)

//   const existingCategories = await categoryRepo.count()
//   if (existingCategories > 0) {
//     console.log('ℹ️ Categories and topics already exist, skipping seed...')
//     return
//   }

//   console.log('🌱 Creating categories & topics...')

//   // 1️⃣ Danh sách chủ đề & nhóm chủ đề
//   const categoriesData = [
//     {
//       name: 'Everyday English',
//       description: 'Common words used in daily conversations',
//       topics: [
//         { name: 'Greetings', description: 'Basic greetings and introductions' },
//         { name: 'Food & Drinks', description: 'Common foods, meals and drinks' },
//         { name: 'Shopping', description: 'Phrases and vocabulary for shopping' },
//       ],
//     },
//     {
//       name: 'Travel & Transport',
//       description: 'Words and phrases used when travelling',
//       topics: [
//         { name: 'Airports', description: 'Travel vocabulary related to flying' },
//         { name: 'Hotels', description: 'Vocabulary about staying in hotels' },
//         { name: 'Directions', description: 'Asking and giving directions' },
//       ],
//     },
//     {
//       name: 'Work & Education',
//       description: 'Office, job, and school-related vocabulary',
//       topics: [
//         { name: 'Jobs', description: 'Common professions and workplace terms' },
//         { name: 'School Life', description: 'Words about study, teachers, exams' },
//       ],
//     },
//   ]

//   // 2️⃣ Lưu vào DB
//   for (const cat of categoriesData) {
//     const category = categoryRepo.create({
//       name: cat.name,
//       description: cat.description,
//     })
//     await categoryRepo.save(category)

//     for (const topicData of cat.topics) {
//       let topic = await topicRepo.findOne({ where: { name: topicData.name } })
//       if (!topic) {
//         topic = topicRepo.create({
//           name: topicData.name,
//           description: topicData.description,
//         })
//         await topicRepo.save(topic)
//       }

//       // Liên kết Category - Topic
//       const catTopic = categoryTopicRepo.create({
//         category,
//         topic,
//       })
//       await categoryTopicRepo.save(catTopic)
//     }
//   }

//   console.log('✅ Seeded categories & topics successfully!')
// }