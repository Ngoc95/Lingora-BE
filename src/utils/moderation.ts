export const BAD_WORDS = [
    "ngu",
    "đmm",
    "dm",
    "đm",
    "vcl",
    "đéo",
    "chó",
    "cút",
    "khùng",
    "điên",
    "óc chó",
    "ngu lol",
    "ngu lồn"
];

export const checkContent = (content: string): { isClean: boolean; detectedWord?: string } => {
    if (!content) return { isClean: true };
    
    const lowerContent = content.toLowerCase();
    
    for (const word of BAD_WORDS) {
        // Simple includes check as requested for "fake AI"
        // For better matching we could use regex with word boundaries but let's keep it simple as user asked "prompt tủ thoi"
        if (lowerContent.includes(word)) {
            return { isClean: false, detectedWord: word };
        }
    }
    
    return { isClean: true };
};
