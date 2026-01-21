import React from 'react';
import { Sidebar } from './Sidebar';
import { TopPanel } from '../Control/TopPanel';
import { useAppStore } from '../../store/useAppStore';

export function MainLayout({ children }) {
    // We only show the TopPanel inside the "Workspace" tab, 
    // OR we might want a different header for Dashboard.
    // The user requested TopPanel stays in "Main Tab" (Workspace).

    // Actually, Layout wraps everything. The content decides what to show.

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {children}
            </div>
        </div>
    );
}
