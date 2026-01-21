import { GoogleGenAI } from "@google/genai";


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateWithRetry(ai, modelName, prompt, base64Data, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`Attempting generation with model: ${modelName} (Attempt ${attempt + 1}/${retries + 1})`);
            const response = await ai.models.generateContent({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json"
                },
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/png",
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ]
            });

            // If successful, parse and return
            const text = response.text;
            console.log("Gemini Response:", text);
            return JSON.parse(text.trim());

        } catch (error) {
            console.warn(`Error with model ${modelName} on attempt ${attempt + 1}:`, error);

            // If it's the last attempt or not a retryable error (like auth), rethrow to move to next model
            // 503 is retryable. 429 is retryable.
            const isRetryable = !error.status || error.status === 503 || error.status === 429;

            if (!isRetryable || attempt === retries) {
                throw error; // Propagate to fallback loop
            }

            // Wait before retry (exponential backoff: 1s, 2s, 4s...)
            await delay(1000 * Math.pow(2, attempt));
        }
    }
}

export async function generateCardsGemini(imageBase64, apiKey, textContent, existingContext = "", promptTemplate, primaryModelId = "", fallbackModels = [], maxRetries = 1) {
    if (!apiKey) throw new Error("API Key is missing");

    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const genAI = new GoogleGenAI({ apiKey });

    // Use provided template or fallback
    const template = promptTemplate || `You are an expert Flashcard Creator...`;
    const prompt = template
        .replace('{{textContent}}', textContent || "")
        .replace('{{existingContext}}', existingContext || "None");

    console.log("--- GEMINI PROMPT START ---");
    console.log(prompt);
    console.log("--- GEMINI PROMPT END ---");

    const modelsToTry = [primaryModelId, ...fallbackModels];
    let lastError = null;

    // Model Fallback Loop
    for (const modelName of modelsToTry) {
        try {
            return await generateWithRetry(genAI, modelName, prompt, base64Data, maxRetries);
        } catch (error) {
            console.error(`Failed with model ${modelName}. Falling back...`);
            lastError = error;
            // Continue to next model
        }
    }

    // If all models fail
    console.error("All Gemini models failed.");
    throw lastError || new Error("All models failed to generate content.");
}
