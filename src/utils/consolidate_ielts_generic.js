const fs = require('fs');
const path = require('path');

// Helper function to read, transform, and write JSON files
const processFile = (inputFilename, outputFilename) => {
    const sourcePath = path.join(__dirname, `../data/${inputFilename}`);
    const targetPath = path.join(__dirname, `../data/${outputFilename}`);

    if (!fs.existsSync(sourcePath)) {
        console.error(`Source file not found: ${sourcePath}`);
        return;
    }

    try {
        const rawData = fs.readFileSync(sourcePath, 'utf-8');
        const examData = JSON.parse(rawData);
        const originalSections = examData.sections;

        const newSections = [];

        // --- 1. LISTENING ---
        // Combine all LISTENING sections into one single "Listening" section
        const listeningSections = originalSections.filter(s => s.sectionType === 'LISTENING');
        
        if (listeningSections.length > 0) {
            // Calculate total duration for the new Listening section
            const totalDuration = listeningSections.reduce((sum, sec) => sum + (sec.durationSeconds || 0), 0);
            
            // Map each original listening section to a group within the new single section
            const newListeningGroups = listeningSections.map((sec, index) => {
                // Each original Listening Section becomes a SectionGroup
                // The questions from internal groups become the question pool for that SectionGroup
                const combinedQuestions = sec.groups.flatMap(g => g.questions || []);
                const originalGroup = sec.groups[0] || {};
                
                // Use the content/description from the first group of the section as the main description
                let content = originalGroup.content || "";
                let description = originalGroup.description || sec.description || "";
                
                // Flatten questionGroups if they exist, otherwise wrap combinedQuestions
                let questionGroups = [];
                
                if (originalGroup.questionGroups && originalGroup.questionGroups.length > 0) {
                     questionGroups = originalGroup.questionGroups;
                } else {
                    // Fallback logic if questionGroups structure is missing or different
                    // (This logic was in the original script but might need adjustment based on file content)
                    // For now, we will try to preserve the existing questionGroups structure from the source
                    // If source doesn't have questionGroups (which it seems to have), we might need to construct them.
                     questionGroups = [
                        {
                            title: `Questions ${combinedQuestions[0]?.prompt?.split(' ')[0] || '?'} - ${combinedQuestions[combinedQuestions.length-1]?.prompt?.split(' ')[0] || '?'}`, // Fallback title
                            questions: combinedQuestions,
                             metadata: { 
                                questionStart: parseInt(combinedQuestions[0]?.prompt) || 0, 
                                questionEnd: parseInt(combinedQuestions[combinedQuestions.length-1]?.prompt) || 0
                            }
                        }
                    ];
                }


                return {
                    groupType: "LISTENING_PART",
                    title: sec.title || `SECTION ${index + 1}`, // Ensure title exists
                    description: description,
                    content: content,
                    resourceUrl: originalGroup.resourceUrl || "", // Preserve resourceUrl if it exists
                    metadata: originalGroup.metadata || {},
                    questionGroups: questionGroups
                };
            });

            newSections.push({
                sectionType: "LISTENING",
                title: "Listening",
                displayOrder: 1,
                durationSeconds: totalDuration > 0 ? totalDuration : 2400, // Default to 40 mins if 0
                instructions: "This section contains 4 parts. Listen carefully and answer the questions.",
                groups: newListeningGroups
            });
        }

        // --- 2. READING ---
        // Combine all READING sections into one single "Reading" section
        const readingSections = originalSections.filter(s => s.sectionType === 'READING');
        
        if (readingSections.length > 0) {
             const totalDuration = readingSections.reduce((sum, sec) => sum + (sec.durationSeconds || 0), 0);
             
             const newReadingGroups = readingSections.map((sec, index) => {
                 const originalGroup = sec.groups[0] || {};
                 
                 return {
                     groupType: "READING_PASSAGE", // Changed to match likely enum/type
                     title: sec.title || `Reading Passage ${index + 1}`,
                     description: originalGroup.description || sec.description || "",
                     content: originalGroup.content || "",
                     metadata: originalGroup.metadata || {},
                     questionGroups: originalGroup.questionGroups || []
                 };
             });

            newSections.push({
                sectionType: "READING",
                title: "Reading",
                displayOrder: 2,
                durationSeconds: totalDuration > 0 ? totalDuration : 3600, // Default to 60 mins
                instructions: "This section contains 3 passages. Read carefully and answer the questions.",
                groups: newReadingGroups
            });
        }

        // --- 3. WRITING ---
        const writingSections = originalSections.filter(s => s.sectionType === 'WRITING');
        if (writingSections.length > 0) {
             const totalDuration = writingSections.reduce((sum, sec) => sum + (sec.durationSeconds || 0), 0);
             
             const newWritingGroups = writingSections.map((sec, index) => {
                 const originalGroup = sec.groups[0] || {};
                 return {
                     groupType: "WRITING_TASK",
                     title: sec.title || `Writing Task ${index + 1}`,
                     description: originalGroup.description || sec.description || "",
                     content: originalGroup.content || "",
                     metadata: originalGroup.metadata || {},
                     questionGroups: originalGroup.questionGroups || [] // Writing usually doesn't have questionGroups like this, but preserving structure
                 };
             });

            newSections.push({
                sectionType: "WRITING",
                title: "Writing",
                displayOrder: 3,
                durationSeconds: totalDuration > 0 ? totalDuration : 3600,
                instructions: "This section contains 2 tasks.",
                groups: newWritingGroups
            });
        }

        // --- 4. SPEAKING ---
        const speakingSections = originalSections.filter(s => s.sectionType === 'SPEAKING');
        if (speakingSections.length > 0) {
            const totalDuration = speakingSections.reduce((sum, sec) => sum + (sec.durationSeconds || 0), 0);
            
             const newSpeakingGroups = speakingSections.map((sec, index) => {
                 const originalGroup = sec.groups[0] || {};
                 return {
                     groupType: "SPEAKING_PART",
                     title: sec.title || `Speaking Part ${index + 1}`,
                     description: originalGroup.description || sec.description || "",
                     content: originalGroup.content || "",
                     metadata: originalGroup.metadata || {},
                     questionGroups: originalGroup.questionGroups || []
                 };
             });

            newSections.push({
                sectionType: "SPEAKING",
                title: "Speaking",
                displayOrder: 4,
                durationSeconds: totalDuration > 0 ? totalDuration : 900, // ~15 mins
                instructions: "This section contains 3 parts.",
                groups: newSpeakingGroups
            });
        }
        
        // Assemble final JSON
        const newExamData = {
            ...examData,
            sections: newSections
        };

        fs.writeFileSync(targetPath, JSON.stringify(newExamData, null, 2));
        console.log(`Successfully processed ${inputFilename} -> ${outputFilename}`);

    } catch (err) {
        console.error(`Error processing ${inputFilename}:`, err);
    }
};

// Execute for the requested files
processFile('IELTS_Test_2_new.json', 'IELTS_Test_2_new.json');
processFile('IELTS_Test_3.json', 'IELTS_Test_3.json');
processFile('IELTS_Test_4.json', 'IELTS_Test_4.json');
