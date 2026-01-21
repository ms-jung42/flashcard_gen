// Simulate LLM delay and response
export async function mockGenerateCards(pageText, prompt) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: crypto.randomUUID(),
                    type: 'basic',
                    front: "What is the mitochondria?",
                    back: "The powerhouse of the cell.",
                    tags: ["biology", "basics"]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'basic',
                    front: "Define 'ATP'.",
                    back: "Adenosine Triphosphate - the energy currency of the cell.",
                    tags: ["biology", "energy"]
                },
                {
                    id: crypto.randomUUID(),
                    type: 'basic',
                    front: "What is the process of cell division called?",
                    back: "Mitosis (for somatic cells) or Meiosis (for gametes).",
                    tags: ["biology", "cell-division"]
                }
            ]);
        }, 2000); // 2 second delay
    });
}
