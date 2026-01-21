import React, { useEffect, useLayoutEffect } from 'react';
import { getContrastColor, adjustBrightness } from './lib/utils';
import { useAppStore } from './store/useAppStore';
import { MainLayout } from './components/Layout/MainLayout';
import { SplitView } from './components/Layout/SplitView';
import { PDFViewer } from './components/PDF/PDFViewer';
import { CardGraph } from './components/Cards/CardGraph';
import { TopPanel } from './components/Control/TopPanel';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Settings } from './components/Settings/Settings';

const ACCENT_COLORS = {
    blue: '221.2 83.2% 53.3%',
    violet: '262.1 83.3% 57.8%',
    green: '142.1 76.2% 36.3%',
    orange: '24.6 95% 53.1%',
};

function App() {
    const { pdfFile, theme, activeTab, userSettings, updateStudyTime } = useAppStore();

    // Helper: Hex to HSL string (space separated)
    const hexToHSL = (H) => {
        let r = 0, g = 0, b = 0;
        if (H.length == 4) {
            r = "0x" + H[1] + H[1];
            g = "0x" + H[2] + H[2];
            b = "0x" + H[3] + H[3];
        } else if (H.length == 7) {
            r = "0x" + H[1] + H[2];
            g = "0x" + H[3] + H[4];
            b = "0x" + H[5] + H[6];
        }
        r /= 255; g /= 255; b /= 255;
        let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;

        if (delta == 0) h = 0;
        else if (cmax == r) h = ((g - b) / delta) % 6;
        else if (cmax == g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;

        h = Math.round(h * 60);
        if (h < 0) h += 360;

        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);

        return `${h} ${s}% ${l}%`;
    };

    // Study Timer (Tracks active session time in Workspace)
    useEffect(() => {
        let interval;
        if (activeTab === 'workspace') {
            interval = setInterval(() => {
                updateStudyTime(60);
            }, 60000);
        }
        return () => clearInterval(interval);
    }, [activeTab, updateStudyTime]);

    // Apply Theme & Accent Color Synchronously to prevent flash
    useLayoutEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Apply Accent Color
        let activeColor = userSettings.themeColor;
        let hslValue = '';
        let exactHex = '';

        if (activeColor.startsWith('custom-')) {
            const preset = userSettings.customPresets?.find(p => p.id === activeColor);
            if (preset) {
                exactHex = theme === 'dark' ? preset.dark : preset.light;
            }
        } else if (activeColor === 'custom' && userSettings.customColors) {
            exactHex = theme === 'dark' ? userSettings.customColors.dark : userSettings.customColors.light;
        } else if (activeColor && ACCENT_COLORS[activeColor]) {
            // We only have HSL here. Need to approximate or use strict contrast mapping for presets?
            // Actually, for presets (blue, violet, green, orange), they are all fairly dark/saturated, so WHITE text is safe.
            // But if we want to be strict, we'd need hex for them. 
            // For now, let's assume presets are "dark enough" for white text, except maybe if we add a light yellow.
            // But let's use the provided HSL `ACCENT_COLORS`.
            hslValue = ACCENT_COLORS[activeColor];
        }

        if (exactHex) {
            hslValue = hexToHSL(exactHex);
        }

        if (hslValue) {
            root.style.setProperty('--primary', hslValue);

            // Calculate Contrast for Foreground
            let foregroundHsl = '210 40% 98%'; // Default White
            let contrast = 'white';

            if (exactHex) {
                contrast = getContrastColor(exactHex, theme);
                if (contrast === 'black') {
                    foregroundHsl = '222.2 47.4% 11.2%'; // Slate-900 (Dark)
                }
            }
            root.style.setProperty('--primary-foreground', foregroundHsl);

            // Calculate "Soft" Background for Buttons (Generate More)
            // User Req: "lighter by 70% if white contrast, darker by 70% if black contrast"
            if (exactHex) {
                let softHex = '';
                if (contrast === 'white') {
                    // Accent is dark (needs white text) -> Background should be 70% lighter (pastel)
                    softHex = adjustBrightness(exactHex, 70);
                } else {
                    // Accent is light (needs black text) -> Background should be 70% darker (deep)
                    // Custom darkening logic since adjustBrightness is for lightening
                    const r = parseInt(exactHex.substr(1, 2), 16);
                    const g = parseInt(exactHex.substr(3, 2), 16);
                    const b = parseInt(exactHex.substr(5, 2), 16);

                    // Darken by 70% (Retain 30% brightness)
                    const factor = 0.3;
                    const newR = Math.floor(r * factor).toString(16).padStart(2, '0');
                    const newG = Math.floor(g * factor).toString(16).padStart(2, '0');
                    const newB = Math.floor(b * factor).toString(16).padStart(2, '0');
                    softHex = `#${newR}${newG}${newB}`;
                }
                root.style.setProperty('--primary-soft', softHex);
            } else {
                // Fallback for HSL only presets (shouldn't happen with current logic as we resolved hex)
                // But if we ever rely purely on HSL, using a generic opacity might be safer.
                // For now, assume exactHex is always available for active colors.
                root.style.setProperty('--primary-soft', `hsl(${hslValue} / 0.2)`);
            }
        }
    }, [theme, userSettings.themeColor, userSettings.customColors, userSettings.customPresets]);

    const isFlipped = userSettings.flipLayout;

    return (
        <MainLayout>
            {activeTab === 'dashboard' && <Dashboard />}

            {activeTab === 'settings' && <Settings />}

            {activeTab === 'workspace' && (
                <div className="flex h-full flex-col overflow-hidden w-full relative animate-in fade-in duration-300">
                    {/* Header / Control Panel */}
                    <header className="flex h-16 shrink-0 items-center border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                        <h1 className="text-xl font-bold tracking-tight mr-auto">FlashcardGen</h1>
                        <TopPanel />
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-hidden relative">
                        <SplitView
                            left={isFlipped ? <CardGraph /> : <PDFViewer />}
                            right={isFlipped ? <PDFViewer /> : <CardGraph />}
                            ratio={isFlipped ? "3:2" : "2:3"}
                        />
                    </main>
                </div>
            )}
        </MainLayout>
    );
}

export default App;
