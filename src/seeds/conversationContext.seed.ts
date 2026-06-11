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
        },
        {
            name: "Phỏng vấn IT",
            slug: "it-interview",
            description: "Phỏng vấn kỹ thuật cho vị trí lập trình viên: giải thích code, kiến trúc hệ thống và kinh nghiệm dự án.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/2721/2721286.png",
            systemPrompt: "You are a senior software engineer conducting a technical interview. Ask the candidate about data structures, algorithms, system design, and past project experience. Use professional and precise technical English. Push for depth in answers.",
            difficultyLevel: ConversationDifficulty.ADVANCED,
            sortOrder: 5,
            templates: [
                { phase: 'opening', text: "Let's start with a brief overview of your technical background.", sortOrder: 1 },
                { phase: 'opening', text: "Can you walk me through your most recent project?", sortOrder: 2 },
                { phase: 'developing', text: "How would you design a scalable REST API for a social media platform?", sortOrder: 1 },
                { phase: 'developing', text: "Explain the difference between SQL and NoSQL databases and when you'd use each.", sortOrder: 2 },
                { phase: 'closing', text: "Do you have any questions about our tech stack or team processes?", sortOrder: 1 },
                { phase: 'closing', text: "We'll be in touch regarding the next steps.", sortOrder: 2 },
            ]
        },
        {
            name: "Thuyết trình",
            slug: "presentation",
            description: "Luyện tập thuyết trình trước đám đông bằng tiếng Anh: cấu trúc bài nói, xử lý câu hỏi và diễn đạt tự tin.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/1570/1570024.png",
            systemPrompt: "You are an audience member and moderator during a formal English-language presentation. Ask clarifying questions, challenge weak arguments, and give feedback on clarity. Expect structured responses using phrases like 'In conclusion', 'Moving on to...', and 'As you can see from this chart...'.",
            difficultyLevel: ConversationDifficulty.ADVANCED,
            sortOrder: 6,
            templates: [
                { phase: 'opening', text: "Good afternoon, everyone. Today I'd like to talk about...", sortOrder: 1 },
                { phase: 'opening', text: "Thank you for the opportunity to present on this topic.", sortOrder: 2 },
                { phase: 'developing', text: "Moving on to our key findings, the data clearly shows that...", sortOrder: 1 },
                { phase: 'developing', text: "As illustrated in this slide, there are three main points to consider.", sortOrder: 2 },
                { phase: 'closing', text: "To summarize, we've covered the main challenges and proposed solutions.", sortOrder: 1 },
                { phase: 'closing', text: "I'm happy to take any questions at this point.", sortOrder: 2 },
            ]
        },
        {
            name: "Khám bệnh",
            slug: "doctor-visit",
            description: "Mô tả triệu chứng, hỏi đơn thuốc và trao đổi với bác sĩ bằng tiếng Anh.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966334.png",
            systemPrompt: "You are a general practitioner doctor at a clinic. Listen to the patient's symptoms carefully, ask relevant follow-up questions, and explain diagnoses in plain English. Be professional, empathetic, and clear.",
            difficultyLevel: ConversationDifficulty.INTERMEDIATE,
            sortOrder: 7,
            templates: [
                { phase: 'opening', text: "Good morning, Doctor. I've been feeling unwell for a few days.", sortOrder: 1 },
                { phase: 'opening', text: "I made an appointment because I have a persistent headache.", sortOrder: 2 },
                { phase: 'developing', text: "The pain started about three days ago and gets worse in the evening.", sortOrder: 1 },
                { phase: 'developing', text: "I also have a slight fever and feel very tired all the time.", sortOrder: 2 },
                { phase: 'closing', text: "Should I take this medication with or without food?", sortOrder: 1 },
                { phase: 'closing', text: "Thank you, Doctor. When should I come back for a follow-up?", sortOrder: 2 },
            ]
        },
        {
            name: "Mua sắm & Thương lượng",
            slug: "shopping-negotiation",
            description: "Hỏi về sản phẩm, so sánh giá cả và thương lượng tại cửa hàng hoặc chợ.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081559.png",
            systemPrompt: "You are a sales assistant at a mid-range electronics or clothing store. Help the customer find what they're looking for. Be persuasive but honest. Allow some room for negotiation and offer alternatives if the item is out of stock.",
            difficultyLevel: ConversationDifficulty.BEGINNER,
            sortOrder: 8,
            templates: [
                { phase: 'opening', text: "Excuse me, I'm looking for a laptop under $800.", sortOrder: 1 },
                { phase: 'opening', text: "Hi, do you have this jacket in a medium size?", sortOrder: 2 },
                { phase: 'developing', text: "What's the difference between these two models?", sortOrder: 1 },
                { phase: 'developing', text: "Is there any discount if I buy two items?", sortOrder: 2 },
                { phase: 'closing', text: "I'll take it. Can I pay by card?", sortOrder: 1 },
                { phase: 'closing', text: "Could you wrap it as a gift, please?", sortOrder: 2 },
            ]
        },
        {
            name: "Họp kinh doanh",
            slug: "business-meeting",
            description: "Tham gia cuộc họp, đề xuất ý kiến, phản bác lịch sự và đi đến thống nhất trong môi trường doanh nghiệp.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/1247/1247667.png",
            systemPrompt: "You are a project manager leading a business meeting with international partners. Discuss quarterly targets, project risks, and resource allocation. Use formal corporate English, concise phrasing, and expect structured turn-taking.",
            difficultyLevel: ConversationDifficulty.ADVANCED,
            sortOrder: 9,
            templates: [
                { phase: 'opening', text: "Let's get started. The first item on the agenda is the Q3 report.", sortOrder: 1 },
                { phase: 'opening', text: "Thank you all for joining. I'd like to begin by reviewing last quarter's performance.", sortOrder: 2 },
                { phase: 'developing', text: "I'd like to propose increasing the marketing budget by 15%.", sortOrder: 1 },
                { phase: 'developing', text: "With respect, I think we need to reassess the timeline before committing resources.", sortOrder: 2 },
                { phase: 'closing', text: "To wrap up, let's agree on the action items before we adjourn.", sortOrder: 1 },
                { phase: 'closing', text: "I'll send the meeting minutes by end of day. Thank you, everyone.", sortOrder: 2 },
            ]
        },
        {
            name: "Nhà hàng & Ẩm thực",
            slug: "restaurant",
            description: "Đặt bàn, gọi món, hỏi về thực đơn và chia sẻ trải nghiệm ẩm thực bằng tiếng Anh.",
            iconUrl: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
            systemPrompt: "You are a friendly and attentive waiter at an upscale restaurant. Guide the guest through the menu, make recommendations based on preferences, handle special dietary requests, and ensure an enjoyable dining experience. Use polite, warm, and professional language.",
            difficultyLevel: ConversationDifficulty.BEGINNER,
            sortOrder: 10,
            templates: [
                { phase: 'opening', text: "Good evening! I have a reservation under the name Smith.", sortOrder: 1 },
                { phase: 'opening', text: "Hi, do you have a table for two available?", sortOrder: 2 },
                { phase: 'developing', text: "What do you recommend for a vegetarian?", sortOrder: 1 },
                { phase: 'developing', text: "I'm allergic to nuts – could you check if this dish contains any?", sortOrder: 2 },
                { phase: 'closing', text: "Could we have the bill, please? We'd like to split it.", sortOrder: 1 },
                { phase: 'closing', text: "Everything was wonderful. Compliments to the chef!", sortOrder: 2 },
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
