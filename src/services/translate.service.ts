import { TranslatePhraseBodyReq } from "../dtos/req/translate/translatePhraseBody.req"
import { BadRequestError } from "../core/error.response"
import { env } from "../config/env"
import axios from "axios"

// Google Translate API loader
// eslint-disable-next-line @typescript-eslint/no-var-requires
const translateModule = require("@vitalets/google-translate-api")
const googleTranslateFn =
    typeof translateModule === "function"
        ? translateModule
        : typeof translateModule?.default === "function"
            ? translateModule.default
            : typeof translateModule?.translate === "function"
                ? translateModule.translate
                : null

if (!googleTranslateFn) {
    console.warn("⚠️ Google Translate API not available")
}

class TranslateService {

    // Translate bằng Google Translate API
    private translateWithGoogle = async (text: string, from: string, to: string) => {
        if (!googleTranslateFn) {
            throw new Error("Google Translate API not available")
        }

        const maxRetries = 1
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
                const res = await googleTranslateFn(text, { from, to })
                return res.text as string
            } catch (error: any) {
                const errorMsg = error?.message || ""
                if (errorMsg.includes("Too Many Requests")) {
                    throw new Error("RATE_LIMIT")
                }
                throw error
            }
        }
    }

    // Translate bằng LibreTranslate (Free API, không cần key)
    private translateWithLibreTranslate = async (text: string, from: string, to: string): Promise<string> => {
        try {
            const response = await axios.post(env.LIBRETRANSLATE_API_URL, {
                q: text,
                source: from,
                target: to,
                format: 'text'
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.data?.translatedText) {
                return response.data.translatedText
            }
            throw new Error("LibreTranslate returned invalid response")
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw new Error("RATE_LIMIT")
            }
            throw new Error(`LibreTranslate failed: ${error?.message || 'Unknown error'}`)
        }
    }

    // Translate bằng MyMemory Translation API (Free, không cần key)
    private translateWithMyMemory = async (text: string, from: string, to: string): Promise<string> => {
        try {
            const response = await axios.get(env.MYMEMORY_API_URL, {
                params: {
                    q: text,
                    langpair: `${from}|${to}`
                },
                timeout: 10000
            })

            if (response.data?.responseData?.translatedText) {
                return response.data.responseData.translatedText
            }
            throw new Error("MyMemory returned invalid response")
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw new Error("RATE_LIMIT")
            }
            throw new Error(`MyMemory failed: ${error?.message || 'Unknown error'}`)
        }
    }


    translatePhrase = async ({ text, sourceLang, targetLang }: TranslatePhraseBodyReq) => {
        const normalized = text?.trim()
        if (!normalized) {
            throw new BadRequestError({ message: "text is required" })
        }

        const from = sourceLang || "en"
        const to = targetLang || "vi"
        const provider = env.TRANSLATE_PROVIDER || 'auto'

        // Strategy: auto - try tất cả providers theo thứ tự
        if (provider === 'auto') {
            const providers = [
                { name: 'google', fn: () => this.translateWithGoogle(normalized, from, to) },
                { name: 'libretranslate', fn: () => this.translateWithLibreTranslate(normalized, from, to) },
                { name: 'mymemory', fn: () => this.translateWithMyMemory(normalized, from, to) },
            ]

            let lastError: any = null
            for (const { name, fn } of providers) {
                try {
                    const translatedText = await fn()
                    return {
                        originalText: normalized,
                        translatedText,
                        from,
                        to,
                        provider: name
                    }
                } catch (error: any) {
                    lastError = error
                    console.warn(`⚠️ ${name} translation failed, trying next provider...`)
                    continue
                }
            }

            throw new BadRequestError({
                message: "All translation services unavailable. Please try again later."
            })
        }

        // Strategy: specific provider
        if (provider === 'google') {
            try {
                const translatedText = await this.translateWithGoogle(normalized, from, to)
                return { originalText: normalized, translatedText, from, to, provider: 'google' }
            } catch (error: any) {
                if (error.message === "RATE_LIMIT") {
                    throw new BadRequestError({
                        message: "Google Translate rate limited. Please try again in a few minutes."
                    })
                }
                throw new BadRequestError({ message: error.message || "Unable to translate phrase" })
            }
        }

        if (provider === 'libretranslate') {
            try {
                const translatedText = await this.translateWithLibreTranslate(normalized, from, to)
                return { originalText: normalized, translatedText, from, to, provider: 'libretranslate' }
            } catch (error: any) {
                throw new BadRequestError({ message: error.message || "LibreTranslate failed" })
            }
        }

        if (provider === 'mymemory') {
            try {
                const translatedText = await this.translateWithMyMemory(normalized, from, to)
                return { originalText: normalized, translatedText, from, to, provider: 'mymemory' }
            } catch (error: any) {
                throw new BadRequestError({ message: error.message || "MyMemory failed" })
            }
        }

        // Strategy: hybrid (try Google first, fallback to free APIs)
        if (provider === 'hybrid') {
            try {
                const translatedText = await this.translateWithGoogle(normalized, from, to)
                return { originalText: normalized, translatedText, from, to, provider: 'google' }
            } catch (error: any) {
                if (error.message === "RATE_LIMIT") {
                    console.log("🔄 Google rate limited, trying LibreTranslate...")
                    try {
                        const translatedText = await this.translateWithLibreTranslate(normalized, from, to)
                        return { originalText: normalized, translatedText, from, to, provider: 'libretranslate' }
                    } catch (libreError: any) {
                        console.log("🔄 LibreTranslate failed, trying MyMemory...")
                        try {
                            const translatedText = await this.translateWithMyMemory(normalized, from, to)
                            return { originalText: normalized, translatedText, from, to, provider: 'mymemory' }
                        } catch (memoryError: any) {
                            throw new BadRequestError({
                                message: "All translation services unavailable. Please try again later."
                            })
                        }
                    }
                }
                throw new BadRequestError({ message: error.message || "Unable to translate phrase" })
            }
        }

        throw new BadRequestError({
            message: `Unknown translation provider: ${provider}`
        })
    }
}

export const translateService = new TranslateService()
