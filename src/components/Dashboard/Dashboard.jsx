import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Clock, FileText, Layers, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Dashboard() {
    const { recentFiles, stats, setPdfFile, setActiveTab, userSettings, openProject, storedFiles } = useAppStore();

    // Force re-render when custom colors change
    // userSettings is in the store hook, so it should trigger re-render on *any* store change unless we used a selector.
    // We used `useAppStore()` (full state) so it renders on ANY state change. This is inefficient but safe for now.

    const palette = userSettings.clozePalette || ['#3b82f6', '#ef4444', '#22c55e', '#a855f7'];


    const [showAll, setShowAll] = React.useState(false);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    // StatsCard Component (Internal or verify import? It wasn't in list_dir)
    // Assuming StatsCard is a global component or defined in this file below. 
    // If it's not defined, I can't see it. But the code I viewed didn't show it being defined.
    // It must be imported or defined below line 100.
    // Wait, lines 71-74 use StatsCard.
    // I need to check if StatsCard is defined in this file.

    // RENDER LOGIC
    const displayedFiles = showAll ? recentFiles : recentFiles.slice(0, 3);

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background p-8 md:p-12">
            <div className="max-w-4xl mx-auto space-y-16">

                {/* Visual Welcome Header (Golden Ratio Position ~38% down) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                    style={{ paddingTop: '30vh' }}
                >
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                        Welcome back
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        You've created <span className="font-semibold text-primary">{stats.totalCards || 0} cards</span> across <span className="font-semibold text-primary">{storedFiles?.length || 0} knowledge sources</span>.
                    </p>

                    <button
                        onClick={() => {
                            setPdfFile(null); // Ensure we start fresh
                            setActiveTab('workspace');
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
                    >
                        <FileText size={20} />
                        Open New PDF to Study
                    </button>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <StatsCard icon={Layers} label="Total Cards" value={stats.totalCards} colorHex={palette[0]} theme={useAppStore.getState().theme} />
                    <StatsCard icon={FileText} label="Documents" value={storedFiles?.length || 0} colorHex={palette[1]} theme={useAppStore.getState().theme} />
                    <StatsCard icon={TrendingUp} label="Day Streak" value={stats.streakDays} colorHex={palette[2]} theme={useAppStore.getState().theme} />
                    <StatsCard icon={Clock} label="Study Hours" value={((stats.studySeconds || 0) / 3600).toFixed(1)} colorHex={palette[3]} theme={useAppStore.getState().theme} />
                </motion.div>

                {/* Recent Files List */}
                <motion.div
                    variants={item}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-xl font-semibold text-foreground">Recent Libraries</h2>
                        {recentFiles.length > 3 && (
                            <button
                                onClick={() => setShowAll(!showAll)}
                                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                                {showAll ? 'Show Less' : 'See More'}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        {recentFiles.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground italic">No recent files found.</div>
                        ) : (
                            displayedFiles.map(file => (
                                <button
                                    key={file.id || file.name} // Fallback to name if ID missing
                                    onClick={() => openProject(file.name)}
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border text-left group"
                                >
                                    <div className="h-10 w-10 shrink-0 rounded bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-foreground truncate">{file.name}</h3>
                                        <p className="text-xs text-muted-foreground">{new Date(file.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open &rarr;
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Heatmap Section (Moved to Bottom) */}
                <div className="space-y-4 pt-8 pb-12">
                    {/* ... heatmap ... */}
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">Activity Heatmap</h2>
                    <div className="flex justify-center">
                        <HeatmapCalendar />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to get current year dates
// Helper to get current year dates (UTC)
function getYearDates() {
    const dates = [];
    const year = new Date().getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function HeatmapCalendar() {
    const { stats } = useAppStore();
    const dates = getYearDates();
    const activityMap = stats.activity || {};

    const getColor = (count) => {
        if (!count) return "bg-slate-200 dark:bg-slate-800";
        if (count >= 10) return "bg-primary opacity-100";
        if (count >= 5) return "bg-primary opacity-80";
        if (count >= 3) return "bg-primary opacity-60";
        return "bg-primary opacity-40";
    };

    // Correctly align to Monday start
    const startObj = new Date(dates[0]);
    // getDay: Sun=0, Mon=1 ...
    // We want Mon=0...Sun=6
    const dayOfWeek = startObj.getDay();
    const offset = (dayOfWeek + 6) % 7;

    return (
        <div className="flex gap-1 overflow-x-auto p-2 custom-scrollbar">
            {/* 54 weeks covers 366 days + max 6 offset = 372 slots (53*7=371 is risky) */}
            {Array.from({ length: 54 }).map((_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const cellIndex = weekIndex * 7 + dayIndex;
                        const dateIndex = cellIndex - offset;

                        if (dateIndex < 0 || dateIndex >= dates.length) {
                            return <div key={`${weekIndex}-${dayIndex}`} className="w-2.5 h-2.5" />;
                        }

                        const dateStr = dates[dateIndex];
                        const count = activityMap[dateStr] || 0;
                        const colorClass = getColor(count);

                        return (
                            <div
                                key={dateStr}
                                className={cn("w-2.5 h-2.5 rounded-sm transition-all hover:ring-1 hover:ring-offset-1 ring-primary", colorClass)}
                                title={`${dateStr}: ${count} cards`}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    )
}


function StatsCard({ icon: Icon, label, value, colorHex, theme }) {
    // Light Mode: Filled (Tinted BG, Transparent border)
    // Dark Mode: Outline (Colored border, Transparent BG)

    const isDark = theme === 'dark';

    return (
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow">
            <div
                className="p-2 rounded-lg transition-colors border"
                style={{
                    borderColor: isDark ? colorHex : 'transparent',
                    backgroundColor: isDark ? 'transparent' : `${colorHex}25`, // ~15% opacity
                    color: colorHex
                }}
            >
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
}
