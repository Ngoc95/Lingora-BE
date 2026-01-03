import { User } from "~/entities/user.entity"
import { StudySet } from "~/entities/studySet.entity"
import { Post } from "~/entities/post.entity"
import { Flashcard } from "~/entities/flashcard.entity"
import { Quiz } from "~/entities/quiz.entity"
import { StudySetVisibility } from "~/enums/studySetVisibility.enum"
import { StudySetStatus } from "~/enums/studySetStatus.enum"
import { PostStatus } from "~/enums/postStatus.enum"
import { PostTopic } from "~/enums/postTopic.enum"
import { QuizType } from "~/enums/quizType.enum"

export async function seedPostAndStudySetForUser001() {
  console.log('🌱 Checking seed data for User001 Post and StudySet...')

  const user = await User.findOne({ where: { username: 'User001' } })
  if (!user) {
    console.error('❌ User001 not found. Skipping seed.')
    return
  }

  // Check and create StudySet
  let studySet = await StudySet.findOne({ 
      where: { 
          title: 'Vocabulary for IELTS', 
          owner: { id: user.id } 
      } 
  })

  if (!studySet) {
    studySet = StudySet.create({
      title: 'Vocabulary for IELTS',
      description: 'Common vocabulary for IELTS preparation',
      visibility: StudySetVisibility.PUBLIC,
      status: StudySetStatus.PUBLISHED,
      owner: user,
      price: 0
    })
    await studySet.save()
    console.log('✅ StudySet seeded.')
  } else {
    console.log('ℹ️ StudySet already exists.')
  }

  // Ensure Flashcards exist
  const flashcardCount = await Flashcard.count({ where: { studySet: { id: studySet.id } } })
  if (flashcardCount === 0) {
      const flashcardsData = [
      { front: 'Abundance', back: 'Sự phong phú, thừa thãi', example: 'There was an abundance of food at the wedding.' },
      { front: 'Benevolent', back: 'Nhân từ, tốt bụng', example: 'A benevolent smile.' },
      { front: 'Candid', back: 'Thật thà, thẳng thắn', example: 'To be candid with you, I think you made a mistake.' }
    ]

    for (const card of flashcardsData) {
      await Flashcard.create({
        studySet: studySet,
        frontText: card.front,
        backText: card.back,
        example: card.example
      }).save()
    }
    console.log(`✅ Added ${flashcardsData.length} Flashcards.`)
  } else {
      console.log('ℹ️ Flashcards already exist.')
  }

  // Ensure Quizzes exist
  const quizCount = await Quiz.count({ where: { studySet: { id: studySet.id } } })
  if (quizCount === 0) {
    const quizzesData = [
      {
        type: QuizType.MULTIPLE_CHOICE,
        question: "What is the synonym of 'Happy'?",
        options: ["Sad", "Joyful", "Angry", "Tired"],
        correctAnswer: "Joyful"
      },
      {
        type: QuizType.TRUE_FALSE,
        question: "Is 'Apple' a fruit?",
        options: ["True", "False"],
        correctAnswer: "True"
      }
    ]

    for (const quiz of quizzesData) {
      await Quiz.create({
        studySet: studySet,
        type: quiz.type,
        question: quiz.question,
        options: quiz.options,
        correctAnswer: quiz.correctAnswer
      }).save()
    }
    console.log(`✅ Added ${quizzesData.length} Quizzes.`)
  } else {
      console.log('ℹ️ Quizzes already exist.')
  }

  // --- Seed 3 Paid Study Sets ---
  const paidStudySetsData = [
    {
      title: 'Business English Essentials',
      description: 'Key vocabulary for business communication.',
      price: 50000,
      flashcards: [
        { front: 'Agenda', back: 'Chương trình nghị sự', example: 'The first item on the agenda is the budget.' },
        { front: 'Deadline', back: 'Hạn chót', example: 'We have to meet the deadline.' },
        { front: 'Negotiation', back: 'Sự đàm phán', example: 'The negotiation took three hours.' }
      ]
    },
    {
      title: 'Advanced Grammar for TOEIC',
      description: 'Master complex grammar rules for high scores.',
      price: 75000,
      flashcards: [
        { front: 'Nevertheless', back: 'Tuy nhiên', example: 'It was raining; nevertheless, we went out.' },
        { front: 'In spite of', back: 'Mặc dù', example: 'In spite of the rain, we went out.' },
        { front: 'Whereas', back: 'Trong khi (ngược lại)', example: 'He is rich, whereas she is poor.' }
      ]
    },
    {
      title: 'Medical Terminology',
      description: 'Essential terms for medical professionals.',
      price: 100000,
      flashcards: [
        { front: 'Diagnosis', back: 'Chẩn đoán', example: 'The doctor made a quick diagnosis.' },
        { front: 'Prescription', back: 'Đơn thuốc', example: 'Can you fill this prescription?' },
        { front: 'Symptom', back: 'Triệu chứng', example: 'Fever is a common symptom of the flu.' }
      ]
    }
  ]

  for (const data of paidStudySetsData) {
    let paidSet = await StudySet.findOne({ 
      where: { 
        title: data.title, 
        owner: { id: user.id } 
      } 
    })

    if (!paidSet) {
      paidSet = StudySet.create({
        title: data.title,
        description: data.description,
        visibility: StudySetVisibility.PUBLIC,
        status: StudySetStatus.PUBLISHED,
        owner: user,
        price: data.price
      })
      await paidSet.save()
      console.log(`✅ Paid StudySet '${data.title}' seeded.`)

      for (const card of data.flashcards) {
        await Flashcard.create({
          studySet: paidSet,
          frontText: card.front,
          backText: card.back,
          example: card.example
        }).save()
      }
      console.log(`   - Added ${data.flashcards.length} flashcards.`)
    } else {
      console.log(`ℹ️ Paid StudySet '${data.title}' already exists.`)
    }
  }

  // Check and create Post
  const existingPost = await Post.findOne({ 
      where: { 
          title: 'Tips for IELTS', 
          createdBy: { id: user.id } 
      } 
  })

  if (!existingPost) {
    const post = Post.create({
      title: 'Tips for IELTS',
      content: 'Here are some tips for IELTS...',
      topic: PostTopic.GENERAL,
      status: PostStatus.PUBLISHED,
      createdBy: user,
      thumbnails: [],
      tags: ['ielts', 'tips']
    })
    await post.save()
    console.log('✅ Post seeded.')
  } else {
    console.log('ℹ️ Post already exists.')
  }
}
