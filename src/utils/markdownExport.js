
export const generateMarkdown = (cards, pdfName) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const cleanPdfName = pdfName ? pdfName.replace(/\s+/g, '_').replace(/[^\w\-_]/g, '') : 'Untitled';
    const header = `# Flashcards: ${pdfName || 'Untitled'}\nExported: ${timestamp}\n\n`;

    // Group by Page
    const groups = cards.reduce((acc, card) => {
        const page = card.pageNumber || 'Unsorted';
        if (!acc[page]) acc[page] = [];
        acc[page].push(card);
        return acc;
    }, {});

    const sortedPages = Object.keys(groups).sort((a, b) => {
        if (a === 'Unsorted') return -1;
        if (b === 'Unsorted') return 1;
        return Number(a) - Number(b);
    });

    let markdown = header;

    sortedPages.forEach(page => {
        markdown += `## Page ${page}\n\n`;
        groups[page].forEach(card => {
            const idComment = `<!-- ID: ${card.id} -->`;

            // Build Tags: #pdfName #Page_X #existingTags
            const pageTag = page !== 'Unsorted' ? `#Page_${page}` : '';
            const sourceTag = cleanPdfName ? `#${cleanPdfName}` : '';
            const existingTags = card.tags ? card.tags.map(t => `#${t.replace(/\s+/g, '_')}`).join(' ') : '';

            // Combine and Dedup
            const allTagsStr = [sourceTag, pageTag, existingTags, '#card'].filter(Boolean).join(' ');

            if (card.type === 'cloze') {
                // Cloze Format with Extra Info
                markdown += `### Cloze Card\n`;
                markdown += `**Text**: ${card.text}\n`;
                if (card.back && card.back.trim()) {
                    markdown += `**Extra**: ${card.back}\n`;
                }
                markdown += `**Tags**: ${allTagsStr}\n`;
                markdown += `${idComment}\n\n---\n\n`;
            } else {
                // Basic Format (Labeled)
                markdown += `### Basic Card\n`;
                markdown += `**Front**: ${card.front}\n`;
                markdown += `**Back**: ${card.back}\n`;
                markdown += `**Tags**: ${allTagsStr}\n`;
                markdown += `${idComment}\n\n---\n\n`;
            }
        });
    });

    return markdown;
};

export const downloadMarkdown = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'flashcards.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
