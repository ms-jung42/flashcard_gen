import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function getContrastColor(hexColor, theme = 'light') {
    if (!hexColor) return 'white';

    // Parse hex
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calculate relative luminance (per WCAG)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Adjust threshold based on theme preference
    // "Light mode should prefer white (text) while dark mode should prefer black (text)"
    // Light Mode: High threshold (bias towards White text for standard/dark accents)
    // Dark Mode: Low threshold (bias towards Black text for pastel/light accents)
    const threshold = theme === 'dark' ? 128 : 180;

    return (yiq >= threshold) ? 'black' : 'white';
}

export function adjustBrightness(hex, percent) {
    // strip the hash if it exists
    var hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if (hex.length == 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
        ((0 | (1 << 8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
        ((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
        ((0 | (1 << 8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}
