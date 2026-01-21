// Models configuration is now dynamic

const FLASHCARD_SCHEMA = {
    name: "flashcards_response",
    strict: true,
    schema: {
        type: "object",
        properties: {
            cards: {
                type: "array",
                description: "A list of flashcards generated from the text.",
                items: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            enum: ["basic", "cloze"],
                            description: "The type of flashcard: 'basic' for Q&A, 'cloze' for fill-in-the-blank."
                        },
                        front: {
                            type: "string",
                            description: "The question or front side of the card (for basic type)."
                        },
                        back: {
                            type: "string",
                            description: "The answer (for basic type). For cloze type, this is the Extra Info/Context (optional, max 30 words)."
                        },
                        text: {
                            type: "string",
                            description: "The cloze text with {{c1::hidden}} parts (only for cloze type)."
                        },
                        tags: {
                            type: "array",
                            items: { "type": "string" },
                            description: "Tags for categorizing the card."
                        }
                    },
                    required: ["type", "front", "back", "text", "tags"],
                    additionalProperties: false
                }
            }
        },
        required: ["cards"],
        additionalProperties: false
    }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(modelName, apiKey, prompt, base64Data, baseUrl = null, useSchema = false, retries = 2, customSchema = null) {
    // Construct API URL intelligently
    let url = baseUrl || "https://api.openai.com/v1";
    url = url.replace(/\/+$/, ''); // Strip trailing slash

    // If user didn't include /chat/completions, perform standard append
    if (!url.endsWith('/chat/completions')) {
        url += '/chat/completions';
    }
    const apiUrl = url;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`[OpenAI] Attempt ${attempt + 1}: POST ${apiUrl} (Model: ${modelName}, Schema: ${useSchema})`);

            const body = {
                model: modelName,
                messages: [
                    {
                        role: "system",
                        content: useSchema
                            ? "You are a helpful assistant. Output must strictly follow the provided JSON schema."
                            : "You are a helpful assistant designed to output JSON."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ]
            };

            // Select Format
            if (useSchema) {
                body.response_format = {
                    type: "json_schema",
                    json_schema: customSchema || FLASHCARD_SCHEMA
                };
            } else {
                body.response_format = { type: "json_object" };
            }

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            // Log raw response for debugging
            console.log("[OpenAI] Raw Response:", data);

            // Handle API-level errors (even with 200 OK)
            if (data.error) {
                const msg = typeof data.error === 'string' ? data.error : data.error.message;
                throw new Error(`OpenAI API Error: ${msg}`);
            }

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            if (!data.choices || !data.choices.length) {
                throw new Error("Invalid response structure: 'choices' array is missing or empty.");
            }

            const content = data.choices[0].message.content;

            // Parse JSON
            const parsed = JSON.parse(content);

            // Extraction
            if (useSchema) {
                // With schema, it matches the structure exactly: { cards: [...] }
                const root = (customSchema ? parsed : parsed);
                // Wait, if customSchema is used, the structure depends on "name" in schema?
                // FLASHCARD_SCHEMA has name "flashcards_response", so parsed is { ... }. 
                // Actually OpenAI returns the object matching the schema.
                // Our schema defines `type: object, properties: { cards: ... }`.
                // So parsed should be `{ cards: [...] }`.

                if (parsed.cards && Array.isArray(parsed.cards)) {
                    return parsed.cards;
                }
                // Fallback if model hallucinated structure despite schema
                return Array.isArray(parsed) ? parsed : [];
            } else {
                // OpenAI JSON Mode Logic
                // OpenAI often wraps arrays in a root object key like "cards" or "flashcards" if not strictly prompted for an array.
                // But our prompt asks for a "JSON array of objects". 
                // If it returns { "cards": [...] }, we extract inner.
                if (!Array.isArray(parsed) && typeof parsed === 'object') {
                    const values = Object.values(parsed);
                    const arrayCandidate = values.find(v => Array.isArray(v));
                    if (arrayCandidate) return arrayCandidate;
                }
                return Array.isArray(parsed) ? parsed : [];
            }

        } catch (error) {
            console.warn(`[OpenAI] Error with model ${modelName} on attempt ${attempt + 1}:`, error);

            const isRetryable = !error.status || error.status === 429 || error.status === 503 || error.status >= 500;

            if (!isRetryable || attempt === retries) {
                throw error;
            }

            await delay(1000 * Math.pow(2, attempt));
        }
    }
}

export async function generateCardsOpenAI(base64Image, apiKey, textContent, existingContext, promptTemplate, baseUrl = null, primaryModelId = "", useSchema = false, fallbackModels = [], maxRetries = 1, customSchema = null) {
    // If using Local LLM, apiKey might be dummy, but baseUrl is critical.
    if (!apiKey && !baseUrl) throw new Error("API Key is required for OpenAI.");

    // Use provided template or fallback
    const template = promptTemplate || `You are an expert Flashcard Creator...`;

    // OpenAI's prompt structure differs slightly from Gemini's text-only inline, but the text part is compatible.
    const prompt = template
        .replace('{{textContent}}', textContent || "")
        .replace('{{existingContext}}', existingContext || "None");

    console.log("--- OPENAI PROMPT START ---");
    console.log(`Model: ${primaryModelId}, BaseURL: ${baseUrl || 'Default'}, useSchema: ${useSchema}, Retries: ${maxRetries}`);
    console.log(prompt);
    console.log("--- OPENAI PROMPT END ---");

    const modelsToTry = [primaryModelId, ...fallbackModels];
    let lastError = null;

    // Model Fallback Loop
    for (const modelName of modelsToTry) {
        try {
            // Only retry once per model to avoid waiting too long if it's a model-specific issue
            return await generateWithRetry(modelName, apiKey, prompt, base64Image, baseUrl, useSchema, maxRetries, customSchema);
        } catch (error) {
            console.error(`Failed with model ${modelName}. Falling back...`);
            lastError = error;
            // Continue to next model
        }
    }

    // If all models fail
    console.error("All OpenAI models failed.");
    throw lastError || new Error("All OpenAI models failed to generate content.");
}
