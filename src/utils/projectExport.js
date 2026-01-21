import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateMarkdown } from './markdownExport';

// Helper: Convert Base64 to Blob
const base64ToBlob = (base64) => {
    try {
        const parts = base64.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
        console.error("Base64 conversion failed", e);
        return null;
    }
};

// Helper: Convert Blob/File to Base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

/**
 * Export Project as ZIP
 * Includes: flashcards.md, project.json, assets/{images}
 */
export const exportProjectZip = async (cards, pdfName, fullStoreState) => {
    const zip = new JSZip();
    const cleanName = pdfName ? pdfName.replace(/\.pdf$/i, '').replace(/[^\w\-_]/g, '_') : 'project';

    // 1. Assets Folder
    const assetsFolder = zip.folder("assets");

    // Process Cards to Extract Images
    const processedCards = cards.map(c => {
        const newCard = { ...c };

        // Process Front Images
        if (c.frontImages?.length) {
            newCard.frontImagePaths = c.frontImages.map((b64, idx) => {
                const blob = base64ToBlob(b64);
                if (!blob) return null;
                const filename = `img_${c.id}_f_${idx}.png`; // Simplified name
                assetsFolder.file(filename, blob);
                return `assets/${filename}`;
            }).filter(Boolean);
        }

        // Process Back Images
        if (c.backImages?.length) {
            newCard.backImagePaths = c.backImages.map((b64, idx) => {
                const blob = base64ToBlob(b64);
                if (!blob) return null;
                const filename = `img_${c.id}_b_${idx}.png`;
                assetsFolder.file(filename, blob);
                return `assets/${filename}`;
            }).filter(Boolean);
        }

        return newCard;
    });

    // 2. Flashcards.md
    let markdown = `# Flashcards: ${pdfName}\n\n`;

    // Group by page logic
    const groups = processedCards.reduce((acc, c) => {
        const p = c.pageNumber || 'Unsorted';
        if (!acc[p]) acc[p] = [];
        acc[p].push(c);
        return acc;
    }, {});

    Object.keys(groups).sort((a, b) => (a === 'Unsorted' ? -1 : b === 'Unsorted' ? 1 : parseInt(a) - parseInt(b))).forEach(page => {
        markdown += `## Page ${page}\n\n`;
        groups[page].forEach(card => {
            markdown += `### ${card.type === 'cloze' ? 'Cloze' : 'Basic'} Card\n`;

            if (card.type === 'cloze') {
                markdown += `**Text**: ${card.text}\n`;
            } else {
                markdown += `**Front**: ${card.front}\n`;
            }

            if (card.frontImagePaths) {
                card.frontImagePaths.forEach(path => {
                    markdown += `![Image](${path})\n`;
                });
            }

            if (card.type === 'cloze') {
                if (card.back) markdown += `**Extra**: ${card.back}\n`;
            } else {
                markdown += `**Back**: ${card.back}\n`;
            }

            if (card.backImagePaths) {
                card.backImagePaths.forEach(path => {
                    markdown += `![Image](${path})\n`;
                });
            }

            const safeTags = card.tags ? card.tags.map(t => '#' + t.replace(/\s+/g, '_')).join(' ') : '';
            markdown += `**Tags**: #${cleanName} #Page_${page} ${safeTags}\n`;
            markdown += `<!-- ID: ${card.id} -->\n\n---\n\n`;
        });
    });

    zip.file("flashcards.md", markdown);

    // 3. Project.json (Restore Point)
    const exportState = {
        version: 1,
        timestamp: Date.now(),
        source: "Antigravity Flashcards",
        state: fullStoreState
    };

    zip.file("project.json", JSON.stringify(exportState, null, 2));

    // Generate and Download
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${cleanName}_Export.zip`);
};

/**
 * Import Project from ZIP
 * Parses project.json OR attempts to reconstruct from assets (advanced, not implemented yet).
 */
export const importProjectZip = async (file) => {
    const zip = await JSZip.loadAsync(file);

    // Check for project.json
    const projectFile = zip.file("project.json");
    if (projectFile) {
        const jsonStr = await projectFile.async("string");
        const projectData = JSON.parse(jsonStr);
        return projectData.state; // Return the store state
    }

    throw new Error("Invalid Project File: project.json not found");
};
