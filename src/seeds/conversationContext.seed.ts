import { ConversationContext } from '~/entities/conversationContext.entity';
import { ConversationSuggestionTemplate } from '~/entities/conversationSuggestionTemplate.entity';
import { ConversationDifficulty } from '~/enums/conversationDifficulty.enum';

export async function seedConversationContexts() {
    const contextsToSeed = [
        {
            name: "Giao tiếp hàng ngày",
            slug: "daily",
            description: "Bạn bè gặp nhau, nói chuyện về cuộc sống hàng ngày, công việc và sở thích.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/3249/3249872.png",
            systemPrompt: "You are a friendly neighbor or colleague. Use short, simple English suitable for a beginner. The tone should be casual and welcoming.",
            difficultyLevel: ConversationDifficulty.BEGINNER,
            sortOrder: 1,
            templates: [
                { phase: 'opening', text: "Hi! How's it going?", sortOrder: 1 },
                { phase: 'opening', text: "Hey there! Long time no see.", sortOrder: 2 },
                { phase: 'developing', text: "What did you do this weekend?", sortOrder: 1 },
                { phase: 'developing', text: "I've been pretty busy lately.", sortOrder: 2 },
                { phase: 'closing', text: "I have to go now. See you later!", sortOrder: 1 },
                { phase: 'closing', text: "Let's catch up again soon.", sortOrder: 2 },
            ]
        },
        {
            name: "Du lịch",
            slug: "travel",
            description: "Hỏi đường, đặt phòng khách sạn, gọi món tại nhà hàng hoặc sân bay.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/826/826070.png",
            systemPrompt: "You work at a hotel reception desk or a restaurant. Help the traveler. Use clear, polite, but simple English suitable for beginners.",
            difficultyLevel: ConversationDifficulty.BEGINNER,
            sortOrder: 2,
            templates: [
                { phase: 'opening', text: "Hi, I'd like to check in, please.", sortOrder: 1 },
                { phase: 'opening', text: "Excuse me, can you help me?", sortOrder: 2 },
                { phase: 'developing', text: "Could I have a menu, please?", sortOrder: 1 },
                { phase: 'developing', text: "How do I get to the train station?", sortOrder: 2 },
                { phase: 'closing', text: "Thank you for your help.", sortOrder: 1 },
                { phase: 'closing', text: "I'll take it. Thanks!", sortOrder: 2 },
            ]
        },
        {
            name: "Phỏng vấn",
            slug: "interview",
            description: "Phỏng vấn xin việc, giới thiệu bản thân và trả lời các câu hỏi tình huống.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/942/942748.png",
            systemPrompt: "You are a hiring manager interviewing a candidate for a software developer position. Use a professional tone. Ask intermediate-level questions about their experience and skills.",
            difficultyLevel: ConversationDifficulty.INTERMEDIATE,
            sortOrder: 3,
            templates: [
                { phase: 'opening', text: "Good morning. Thank you for having me.", sortOrder: 1 },
                { phase: 'opening', text: "It's a pleasure to meet you.", sortOrder: 2 },
                { phase: 'developing', text: "Let me tell you about my previous experience.", sortOrder: 1 },
                { phase: 'developing', text: "My biggest strength is problem-solving.", sortOrder: 2 },
                { phase: 'closing', text: "Thank you for your time today.", sortOrder: 1 },
                { phase: 'closing', text: "When can I expect to hear from you?", sortOrder: 2 },
            ]
        },
        {
            name: "Học tập",
            slug: "study",
            description: "Thảo luận bài tập nhóm, thuyết trình hoặc nhờ sự trợ giúp từ giáo viên/bạn học.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/3074/3074064.png",
            systemPrompt: "You are a classmate discussing a group project about environmental science. The tone should be friendly but focused on academic topics.",
            difficultyLevel: ConversationDifficulty.INTERMEDIATE,
            sortOrder: 4,
            templates: [
                { phase: 'opening', text: "Should we start working on the project?", sortOrder: 1 },
                { phase: 'opening', text: "Did you understand the lecture today?", sortOrder: 2 },
                { phase: 'developing', text: "I think we should focus on renewable energy.", sortOrder: 1 },
                { phase: 'developing', text: "Could you explain that part again?", sortOrder: 2 },
                { phase: 'closing', text: "Let's divide the work for next week.", sortOrder: 1 },
                { phase: 'closing', text: "Sounds like a good plan. See you tomorrow.", sortOrder: 2 },
            ]
        }
    ];

    console.log('🌱 Seeding conversation contexts...');

    for (const ctxData of contextsToSeed) {
        let context = await ConversationContext.findOne({ where: { slug: ctxData.slug } });

        if (!context) {
            context = ConversationContext.create({
                name: ctxData.name,
                slug: ctxData.slug,
                description: ctxData.description,
                iconUrl: ctxData.iconUrl,
                systemPrompt: ctxData.systemPrompt,
                difficultyLevel: ctxData.difficultyLevel,
                sortOrder: ctxData.sortOrder
            });
            await context.save();
        } else {
            // Update existing prompt or details if needed
            context.name = ctxData.name;
            context.description = ctxData.description;
            context.iconUrl = ctxData.iconUrl;
            context.systemPrompt = ctxData.systemPrompt;
            context.difficultyLevel = ctxData.difficultyLevel;
            context.sortOrder = ctxData.sortOrder;
            await context.save();
        }

        // Seed templates
        const existingTemplatesCount = await ConversationSuggestionTemplate.count({ where: { context: { id: context.id } } });
        
        if (existingTemplatesCount === 0) {
            for (const t of ctxData.templates) {
                const template = ConversationSuggestionTemplate.create({
                    context,
                    phase: t.phase,
                    suggestionText: t.text,
                    sortOrder: t.sortOrder
                });
                await template.save();
            }
        }
    }

    console.log('✅ Conversation contexts seeded successfully!');
}
