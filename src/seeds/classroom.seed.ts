import { Classroom } from "~/entities/classroom.entity";
import { ClassroomMember } from "~/entities/classroomMember.entity";
import { ClassroomLesson } from "~/entities/classroomLesson.entity";
import { ClassroomQuiz } from "~/entities/classroomQuiz.entity";
import { Quiz } from "~/entities/quiz.entity";
import { Flashcard } from "~/entities/flashcard.entity";
import { User } from "~/entities/user.entity";
import { ClassroomStatus } from "~/enums/classroomStatus.enum";
import { ClassroomMemberStatus } from "~/enums/classroomMemberStatus.enum";
import { ClassroomMemberRole } from "~/enums/classroomMemberRole.enum";
import { ClassroomLessonType } from "~/enums/classroomLessonType.enum";
import { QuizType } from "~/enums/quizType.enum";
import { hash } from "bcrypt";
import { UserStatus } from "~/enums/userStatus.enum";

export async function seedClassroomData() {
    console.log('🌱 Seeding classroom data...');

    // 1. Get Users
    const teacher = await User.findOne({ where: { username: 'Ngoc001' } });
    const user001 = await User.findOne({ where: { username: 'User001' } });
    const user002 = await User.findOne({ where: { username: 'User002' } });
    const admin001 = await User.findOne({ where: { username: 'Admin001' } });
    const testApprover = await User.findOne({ where: { username: 'TestApprover' } }) || 
        await (async () => {
            const u = User.create({
                username: 'TestApprover',
                email: 'test_approver@gmail.com',
                password: await hash('User123', 10),
                status: UserStatus.ACTIVE
            });
            return await u.save();
        })();

    if (!teacher || !user001 || !user002 || !admin001) {
        console.warn('⚠️ Some users not found. Seeding may be incomplete.');
    }

    // 2. Classroom: IELTS Masterclass 2024 (With Students)
    const classroom1 = await ensureClassroom(
        'IELTS Masterclass 2024',
        'IELTS-2024',
        'Comprehensive IELTS preparation covering all 4 skills. Target score: 7.5+',
        teacher || null,
        true
    );

    if (classroom1) {
        await ensureMembership(classroom1, [user001, user002, admin001]);
        
        const l1 = await ensureLesson(classroom1, 'Lesson 1: Introduction to IELTS Task 2', 
            'Understanding the structure and scoring criteria of the Writing Task 2.',
            'IELTS Writing Task 2 requires you to write an essay of at least 250 words...',
            ClassroomLessonType.MIXED, 1);
        
        const l2 = await ensureLesson(classroom1, 'Lesson 2: Academic Vocabulary',
            'Key academic words for higher bands.',
            'Focus on synonyms and collocations...',
            ClassroomLessonType.TEXT, 2);

        if (l2) {
            await ensureFlashcards(l2, [
                { frontText: 'Paraphrase', backText: 'Express the same meaning using different words.', example: 'Paraphrasing the prompt is the first step in an essay.' },
                { frontText: 'Cohesion', backText: 'The use of grammatical and lexical means to achieve connected text.', example: 'Using transition words improves cohesion.' },
                { frontText: 'Coherence', backText: 'The quality of being logical and consistent.', example: 'Clear paragraphing helps with coherence.' }
            ]);
        }

        if (l1) {
            await ensureQuiz(classroom1, l1, 'IELTS Grammar Check', 'Test your grasp of complex sentence structures.', [
                {
                    type: QuizType.MULTIPLE_CHOICE,
                    question: 'Which of the following describes a complex sentence?',
                    options: ['One independent clause', 'Two independent clauses joined by a conjunction', 'One independent and at least one dependent clause', 'A sentence with many adjectives'],
                    correctAnswer: 'One independent and at least one dependent clause',
                    explanation: 'A complex sentence contains an independent clause and one or more dependent clauses.'
                },
                {
                    type: QuizType.TRUE_FALSE,
                    question: 'Writing Task 2 is worth twice as many marks as Task 1.',
                    options: ['True', 'False'],
                    correctAnswer: 'True',
                    explanation: 'Task 2 accounts for 2/3 of the total Writing score.'
                }
            ]);
        }

        // Add a pending member
        const isPendingExists = await ClassroomMember.findOne({
            where: { classroom: { id: classroom1.id }, user: { id: testApprover.id } }
        });
        console.log('isPendingExists', isPendingExists);
        if (!isPendingExists) {
            await ClassroomMember.create({
                classroom: classroom1,
                user: testApprover,
                role: ClassroomMemberRole.STUDENT,
                status: ClassroomMemberStatus.PENDING
            }).save();
        }
    }

    // 3. Classroom: TOEIC Intensive 650+ (Empty - For join tests)
    await ensureClassroom(
        'TOEIC Intensive 650+',
        'TOEIC-650',
        'Focus on Part 5, 6 and 7 of the Reading test and intensive Listening practice.',
        teacher || null,
        true
    );

    // 4. Classroom: Daily Conversation (Special Teacher - No Students)
    await ensureClassroom(
        'Daily Conversation',
        'CONV-001',
        'Practical English for everyday situations. Coffee, travel, and networking.',
        admin001 || null,
        true
    );

    console.log('✅ Classroom seeding complete!');
}

async function ensureClassroom(name: string, code: string, description: string, teacher: User | null, isPublic: boolean): Promise<Classroom | null> {
    let classroom = await Classroom.findOne({ where: { code } });
    if (!classroom) {
        console.log(`✨ Creating Classroom: ${name}`);
        classroom = Classroom.create({
            name, code, description, isPublic,
            status: ClassroomStatus.ACTIVE,
            maxStudents: 50,
            teacher
        });
        await classroom.save();
    }
    return classroom;
}

async function ensureMembership(classroom: Classroom, users: (User | null)[]) {
    for (const user of users) {
        if (!user) continue;
        const exists = await ClassroomMember.findOne({
            where: { classroom: { id: classroom.id }, user: { id: user.id } }
        });
        if (!exists) {
            await ClassroomMember.create({
                classroom, user,
                role: ClassroomMemberRole.STUDENT,
                status: ClassroomMemberStatus.ACTIVE
            }).save();
        }
    }
}

async function ensureLesson(classroom: Classroom, title: string, description: string, content: string, type: ClassroomLessonType, order: number) {
    let lesson = await ClassroomLesson.findOne({ where: { classroom: { id: classroom.id }, title } });
    if (!lesson) {
        console.log(`  📝 Adding Lesson: ${title}`);
        lesson = ClassroomLesson.create({
            classroom, title, description, content,
            lessonType: type,
            sortOrder: order,
            isPublished: true
        });
        await lesson.save();
    }
    return lesson;
}

async function ensureFlashcards(lesson: ClassroomLesson, cards: any[]) {
    for (const card of cards) {
        const exists = await Flashcard.findOne({ where: { classroomLesson: { id: lesson.id }, frontText: card.frontText } });
        if (!exists) {
            await Flashcard.create({ ...card, classroomLesson: lesson }).save();
        }
    }
}

async function ensureQuiz(classroom: Classroom, lesson: ClassroomLesson, title: string, description: string, questions: any[]) {
    let classroomQuiz = await ClassroomQuiz.findOne({ where: { classroom: { id: classroom.id }, title } });
    if (!classroomQuiz) {
        console.log(`  ❓ Adding Quiz: ${title}`);
        classroomQuiz = ClassroomQuiz.create({
            classroom, lesson, title, description,
            timeLimitSeconds: 600,
            passingScore: 0.7,
            isPublished: true
        });
        await classroomQuiz.save();

        for (const q of questions) {
            await Quiz.create({ ...q, classroomQuiz }).save();
        }
    }
    return classroomQuiz;
}
