const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'data/IELTS_Test_1_v1.json');
const targetPath = path.join(__dirname, 'data/IELTS_Test_1.json');

const run = () => {
    try {
        const rawData = fs.readFileSync(sourcePath, 'utf-8');
        const examData = JSON.parse(rawData);
        const originalSections = examData.sections;

        const newSections = [];

        // --- 1. LISTENING ---
        const listeningSections = originalSections.filter(s => s.sectionType === 'LISTENING');
        if (listeningSections.length > 0) {
            const newListeningGroups = listeningSections.map((sec, index) => {
                // Each original Listening Section becomes a SectionGroup
                // The questions from internal groups become the question pool for that SectionGroup
                const combinedQuestions = sec.groups.flatMap(g => g.questions || []);
                
                // Determine question groups based on section index
                let questionGroups = [];
                
                if (index === 0) {
                    // Section 1: 1-5, 6-10
                    questionGroups = [
                        {
                            title: "Questions 1-5",
                            description: "Circle the appropriate letter.",
                            questions: combinedQuestions.slice(0, 5),
                            metadata: { questionStart: 1, questionEnd: 5 }
                        },
                        {
                            title: "Questions 6-10",
                            description: "Complete the form. Write NO MORE THAN THREE WORDS for each answer.",
                            questions: combinedQuestions.slice(5, 10),
                            metadata: { questionStart: 6, questionEnd: 10 }
                        }
                    ];
                } else if (index === 1) {
                    // Section 2: 11-13, 14-21
                    questionGroups = [
                        {
                            title: "Questions 11-13",
                            description: "Tick the THREE other items which are mentioned in the news headlines.",
                            questions: combinedQuestions.slice(0, 1), // This group might have 1 multi-select question or 3
                            metadata: { questionStart: 11, questionEnd: 13 }
                        },
                        {
                            title: "Questions 14-21",
                            description: "Complete the notes below by writing NO MORE THAN THREE WORDS in the spaces provided.",
                            questions: combinedQuestions.slice(1),
                            metadata: { questionStart: 14, questionEnd: 21 }
                        }
                    ];
                } else if (index === 2) {
                    // Section 3: 22-25, 26-31
                    questionGroups = [
                        {
                            title: "Questions 22-25",
                            description: "Circle the appropriate letter.",
                            questions: combinedQuestions.slice(0, 4),
                            metadata: { questionStart: 22, questionEnd: 25 }
                        },
                        {
                            title: "Questions 26-31",
                            description: "Complete the notes below using NO MORE THAN THREE WORDS.",
                            questions: combinedQuestions.slice(4),
                            metadata: { questionStart: 26, questionEnd: 31 }
                        }
                    ];
                } else if (index === 3) {
                    // Section 4: 32-33, 34-36, 37-41
                    questionGroups = [
                        {
                            title: "Questions 32-33",
                            description: "Listen to the following talk given by a lecturer.",
                            questions: combinedQuestions.slice(0, 2),
                            metadata: { questionStart: 32, questionEnd: 33 }
                        },
                        {
                            title: "Questions 34-36",
                            description: "Complete the notes in NO MORE THAN THREE WORDS.",
                            questions: combinedQuestions.slice(2, 5),
                            metadata: { questionStart: 34, questionEnd: 36 }
                        },
                        {
                            title: "Questions 37-41",
                            description: "Circle the appropriate letter.",
                            questions: combinedQuestions.slice(5),
                            metadata: { questionStart: 37, questionEnd: 41 }
                        }
                    ];
                }

                let combinedDescription = sec.groups.map(g => g.title).join('\n'); 
                if (sec.instructions) combinedDescription = sec.instructions + '\n' + combinedDescription;

                return {
                    groupType: 'LISTENING_PART',
                    title: sec.title,
                    description: combinedDescription,
                    resourceUrl: sec.audioUrl,
                    metadata: sec.metadata || {},
                    questionGroups: questionGroups
                };
            });

            const totalDuration = listeningSections.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

            newSections.push({
                sectionType: 'LISTENING',
                title: 'Listening',
                displayOrder: 1,
                durationSeconds: totalDuration > 0 ? totalDuration : 1800,
                instructions: 'This section contains 4 parts. Listen carefully and answer the questions.',
                groups: newListeningGroups
            });
        }

        // --- 2. READING ---
        const readingSections = originalSections.filter(s => s.sectionType === 'READING');
        if (readingSections.length > 0) {
            const newReadingGroups = readingSections.map((sec, index) => {
                const combinedQuestions = sec.groups.flatMap(g => g.questions || []);
                const firstGroup = sec.groups[0];
                
                let questionGroups = [];
                
                if (index === 0) {
                    // Passage 1: 1-8, 9-15
                    const wordList = firstGroup.metadata?.wordList;
                    const q9_15 = combinedQuestions.slice(8, 15);
                    let typeOfMatches = null;
                    if (q9_15.length > 0 && q9_15[0].options && typeof q9_15[0].options[0] === 'object') {
                        typeOfMatches = q9_15[0].options;
                    }
                    
                    questionGroups = [
                        {
                            title: "Questions 1-8",
                            description: "Complete the summary below. Choose your answers from the box at the bottom of the page.",
                            content: wordList ? JSON.stringify(wordList) : undefined,
                            questions: combinedQuestions.slice(0, 8),
                            metadata: { questionStart: 1, questionEnd: 8, contentType: 'word_list' }
                        },
                        {
                            title: "Questions 9-15",
                            description: "Look at the following notes. Decide which type of match (A-H) corresponds with each description.",
                            content: typeOfMatches ? JSON.stringify(typeOfMatches) : undefined,
                            questions: q9_15,
                            metadata: { questionStart: 9, questionEnd: 15, contentType: 'options_list' }
                        }
                    ];
                } else if (index === 1) {
                    // Passage 2: 16-22, 23-25, 26-28
                    questionGroups = [
                        {
                            title: "Questions 16-22",
                            description: "YES/NO/NOT GIVEN questions.",
                            questions: combinedQuestions.slice(0, 7),
                            metadata: { questionStart: 16, questionEnd: 22 }
                        },
                        {
                            title: "Questions 23-25",
                            description: "Multiple choice questions.",
                            questions: combinedQuestions.slice(7, 10),
                            metadata: { questionStart: 23, questionEnd: 25 }
                        },
                        {
                            title: "Questions 26-28",
                            description: "Select THREE factors.",
                            questions: combinedQuestions.slice(10, 13),
                            metadata: { questionStart: 26, questionEnd: 28 }
                        }
                    ];
                } else if (index === 2) {
                    // Passage 3: 29-35, 36-40
                    questionGroups = [
                        {
                            title: "Questions 29-35",
                            description: "Fill in the blanks.",
                            questions: combinedQuestions.slice(0, 7),
                            metadata: { questionStart: 29, questionEnd: 35 }
                        },
                        {
                            title: "Questions 36-40",
                            description: "Matching questions.",
                            questions: combinedQuestions.slice(7, 12),
                            metadata: { questionStart: 36, questionEnd: 40 }
                        }
                    ];
                }

                return {
                    groupType: 'PASSAGE',
                    title: sec.title,
                    content: firstGroup.content,
                    description: firstGroup.description,
                    metadata: sec.metadata || {},
                    questionGroups: questionGroups
                };
            });
            
            const totalDuration = readingSections.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

            newSections.push({
                sectionType: 'READING',
                title: 'Reading',
                displayOrder: 2,
                durationSeconds: totalDuration > 0 ? totalDuration : 3600,
                instructions: 'Read the passages and answer the questions.',
                groups: newReadingGroups
            });
        }

        // --- 3. WRITING ---
        const writingSections = originalSections.filter(s => s.sectionType === 'WRITING');
        if (writingSections.length > 0) {
            const newWritingGroups = writingSections.flatMap(sec => sec.groups.map(g => ({
                groupType: g.groupType || 'WRITING_TASK',
                title: g.title,
                description: g.description,
                content: g.content,
                resourceUrl: g.resourceUrl,
                metadata: g.metadata || {},
                questionGroups: [{
                    title: g.title,
                    description: g.description,
                    questions: g.questions || [],
                    metadata: {}
                }]
            })));

            const totalDuration = writingSections.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

            newSections.push({
                sectionType: 'WRITING',
                title: 'Writing',
                displayOrder: 3,
                durationSeconds: totalDuration > 0 ? totalDuration : 3600,
                instructions: 'Complete the writing tasks.',
                groups: newWritingGroups
            });
        }

        // --- 4. SPEAKING ---
        const speakingSections = originalSections.filter(s => s.sectionType === 'SPEAKING');
        if (speakingSections.length > 0) {
            const newSpeakingGroups = speakingSections.flatMap(sec => sec.groups.map(g => ({
                groupType: g.groupType || 'SPEAKING_TASK',
                title: g.title,
                description: g.description,
                content: g.content,
                resourceUrl: g.resourceUrl,
                metadata: g.metadata || {},
                questionGroups: [{
                    title: g.title,
                    description: g.description,
                    questions: g.questions || [],
                    metadata: {}
                }]
            })));

            const totalDuration = speakingSections.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

            newSections.push({
                sectionType: 'SPEAKING',
                title: 'Speaking',
                displayOrder: 4,
                durationSeconds: totalDuration > 0 ? totalDuration : 900,
                instructions: 'Complete the speaking tasks.',
                groups: newSpeakingGroups
            });
        }

        // Create Final Object
        const finalExam = {
            ...examData,
            sections: newSections
        };

        fs.writeFileSync(targetPath, JSON.stringify(finalExam, null, 2));
        console.log(`Successfully created consolidated JSON at ${targetPath}`);

    } catch (e) {
        console.error("Error transforming JSON:", e);
    }
};

run();
