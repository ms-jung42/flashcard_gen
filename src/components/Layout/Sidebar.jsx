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
        <div className="md:w-16 md:h-full w-full h-16 bg-slate-100 dark:bg-slate-900 border-r border-t md:border-t-0 md:border-transparent md:border-r border-slate-200 dark:border-slate-800 flex md:flex-col flex-row items-center py-2 md:py-3.5 px-4 md:px-0 z-50 shrink-0 relative transition-all duration-300 md:order-first order-last">
            {/* App Branding (Logo Only) - Hidden on Mobile to save space */}
            <div className="hidden md:flex mb-6 flex-col items-center justify-center h-10">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Layers size={24} />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex md:flex-col flex-row w-full gap-2 md:gap-4 text-slate-500 dark:text-slate-400 justify-around md:justify-start">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <div key={tab.id} className="relative w-full md:w-full group pl-0 md:pl-1.5 flex justify-center">

                            {/* Connector Curves (Desktop Only) */}
                            {isActive && (
                                <div className="hidden md:block absolute right-0 top-0 bottom-0 w-4 bg-primary z-0 pointer-events-none">
                                    <div className="absolute -top-4 right-0 w-4 h-4 bg-primary">
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 rounded-br-2xl" />
                                    </div>
                                    <div className="absolute -bottom-4 right-0 w-4 h-4 bg-primary">
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 rounded-tr-2xl" />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative md:w-full w-12 h-12 md:h-24 flex md:flex-col items-center justify-center transition-all duration-300 z-10 rounded-xl md:rounded-l-2xl md:rounded-r-none gap-0 md:gap-1",
                                    isActive
                                        ? "bg-primary shadow-md md:shadow-none text-primary-foreground"
                                        : "hover:bg-slate-200 dark:hover:bg-slate-800/50"
                                )
                                }
                                title={tab.label}
                            >
                                <tab.icon
                                    size={20} // Slightly smaller default
                                    className={cn(
                                        "relative z-20 transition-all duration-300 md:w-6 md:h-6",
                                        isActive ? "" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200",
                                        "md:group-hover:-translate-y-1"
                                    )}
                                />
                                <span className={cn(
                                    "hidden md:block relative z-20 text-[10px] font-medium transition-all duration-300 absolute bottom-4",
                                    "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
                                )}
                                >
                                    {tab.label}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Spacer */}
            <div className="flex-1 hidden md:block"></div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary/50 text-slate-500 hover:text-primary transition-all flex items-center justify-center md:mb-4 ml-2 md:ml-0"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Moon size={18} className="md:w-5 md:h-5" /> : <Sun size={18} className="md:w-5 md:h-5" />}
            </button>
        </div>
    );
}
