import React, { useEffect, useState } from 'react';
import { Home, Layout, Settings, Layers, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn, getContrastColor } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
    const { activeTab, setActiveTab, theme, toggleTheme, userSettings } = useAppStore();
    const [accentContrast, setAccentContrast] = useState('white');

    // Determine active accent color for contrast calculation
    useEffect(() => {
        // We need to resolve the actual hex color being used
        // This is a bit tricky since we usually set it via CSS variable, but for JS contrast check we need the Hex.
        // We can approximate or use the custom color if set.
        let color = '#3b82f6'; // Fallback

        if (userSettings.themeColor.startsWith('custom-')) {
            const preset = userSettings.customPresets?.find(p => p.id === userSettings.themeColor);
            if (preset) {
                color = theme === 'dark' ? preset.dark : preset.light;
            }
        } else if (userSettings.themeColor === 'custom' && userSettings.customColors) {
            color = theme === 'dark' ? userSettings.customColors.dark : userSettings.customColors.light;
        } else {
            // Map preset names to hex for calculation (approximate)
            const map = {
                blue: '#3b82f6',
                violet: '#8b5cf6',
                green: '#22c55e',
                orange: '#f97316'
            };
            if (map[userSettings.themeColor]) color = map[userSettings.themeColor];
        }
        setAccentContrast(getContrastColor(color));
    }, [userSettings.themeColor, userSettings.customColors, theme]);


    const tabs = [
        { id: 'dashboard', icon: Home, label: 'Home' },
        { id: 'workspace', icon: Layout, label: 'Workspace' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-16 h-full bg-slate-100 dark:bg-slate-900 border-r border-transparent flex flex-col items-center py-3.5 z-50 shrink-0 relative transition-all duration-300">
            {/* App Branding (Logo Only) */}
            {/* Aligned to TopPanel center (approx h-14/h-16). Sidebar py-6 means top is 24px down. */}
            <div className="mb-6 flex flex-col items-center justify-center h-10">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Layers size={24} />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col w-full gap-4 text-slate-500 dark:text-slate-400">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <div key={tab.id} className="relative w-full group pl-1.5">
                            {/* Added pl-1.5 for slight left margin while keeping edge connection logic */}

                            {/* Connector Curves (Fillets) - Positioned on RIGHT edge of the BUTTON (not container) */}
                            {isActive && (
                                <div className="absolute right-0 top-0 bottom-0 w-4 bg-primary z-0 pointer-events-none">
                                    {/* Top Fillet */}
                                    <div className="absolute -top-4 right-0 w-4 h-4 bg-primary">
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 rounded-br-2xl" />
                                    </div>
                                    {/* Bottom Fillet */}
                                    <div className="absolute -bottom-4 right-0 w-4 h-4 bg-primary">
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 rounded-tr-2xl" />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative w-full h-24 flex flex-col items-center justify-center transition-all duration-300 z-10 rounded-l-2xl gap-1", // Reduced gap
                                    isActive ? "bg-primary shadow-md" : "hover:bg-slate-200 dark:hover:bg-slate-800/50"
                                )
                                }
                                title={tab.label}
                            >
                                {/* Icon */}
                                <tab.icon
                                    size={24}
                                    className={cn(
                                        "relative z-20 transition-all duration-300",
                                        isActive ? "" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200",
                                        // Movement logic: Move up slightly if text is shown
                                        "group-hover:-translate-y-1"
                                    )}
                                    style={{ color: isActive ? 'hsl(var(--primary-foreground))' : undefined }} // Dynamic contrast
                                />
                                <span className={cn(
                                    "relative z-20 text-[10px] font-medium transition-all duration-300 absolute bottom-4", // Adjusted positioning
                                    "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
                                )}
                                    style={{ color: isActive ? 'hsl(var(--primary-foreground))' : undefined }} // Dynamic contrast
                                >
                                    {tab.label}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary/50 text-slate-500 hover:text-primary transition-all flex items-center justify-center mb-4"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
        </div>
    );
}
