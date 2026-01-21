import Anthropic from "@anthropic-ai/sdk";


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateCardsClaude(base64Image, apiKey, textContent, existingContext, promptTemplate, primaryModelId = "claude-3-5-sonnet-20241022", fallbackModels = [], maxRetries = 1) {
    if (!apiKey) throw new Error("Anthropic API Key is required.");

    const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Required for client-side execution
    });

    // Construct the prompt
    let systemPrompt = promptTemplate
        .replace('{{textContent}}', textContent || "No extracted text available.")
        .replace('{{existingContext}}', existingContext || "No existing cards.");

    console.log(`[Anthropic] Config: Primary=${primaryModelId}, Retries=${maxRetries}`);

    const modelsToTry = [primaryModelId, ...fallbackModels];
    let lastError = null;

    for (const model of modelsToTry) {
        // Inner Retry Loop
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempting Claude generation with model: ${model} (Attempt ${attempt + 1}/${maxRetries + 1})`);
                const msg = await anthropic.messages.create({
                    model: model,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: "image/png", // We assume PNG from canvas
                                        data: base64Image,
                                    },
                                },
                                {
                                    type: "text",
                                    text: systemPrompt
                                }
                            ],
                        }
                    ],
                });

                const responseText = msg.content[0].text;
                console.log("Claude Response:", responseText);

                // Parse JSON (Similar logic to other services)
                const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    console.warn("Claude Response invalid JSON:", responseText);
                    throw new Error("Could not parse JSON array from Claude response.");
                }

                return JSON.parse(jsonMatch[0]);

            } catch (error) {
                console.warn(`Failed with Claude model ${model} (Attempt ${attempt + 1}):`, error);

                // Determine if retryable (Anthropic SDK might allow checking types, but generic check for now)
                // 429, 500, 503 are retryable. 400 (invalid request) is not.
                // Assuming error.status exists or similar.
                const isRetryable = !error.status || error.status === 429 || error.status >= 500;

                lastError = error;

                if (!isRetryable || attempt === maxRetries) {
                    break; // Break inner loop to try next model (or fail if last model)
                }

                // Wait before retry
                await delay(1000 * Math.pow(2, attempt));
            }
        }
    }

    throw new Error(`All Claude models failed. Last error: ${lastError?.message}`);
}

