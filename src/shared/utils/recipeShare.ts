import type { Recipe } from '../domain/entities';
import {
    calculateCoffeeDose,
    formatDuration,
    formatWeight,
    formatVolume,
    formatMethodName,
    getBrewSteps,
    getBrewDuration,
    getValveStates,
    type UnitSystem
} from './brewMath';

/**
 * Format recipe as a comprehensive WhatsApp / Threads friendly text message
 * including valve positions, step instructions, and bean recommendations.
 */
export const formatRecipeShareText = (recipe: Recipe, unitSystem: UnitSystem = 'metric'): string => {
    const dose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
    const methodName = formatMethodName(recipe.method_id);
    const brewSteps = getBrewSteps(recipe.steps || []);
    const totalDuration = getBrewDuration(recipe.steps || []);
    const valveStates = getValveStates(brewSteps);

    const lines: string[] = [];

    // Header
    lines.push(`☕ *${recipe.name}*`);
    lines.push(`📖 *Method:* ${methodName}`);
    if (recipe.style) lines.push(`🎨 *Style:* ${recipe.style}`);
    if (recipe.difficulty) lines.push(`⚡ *Difficulty:* ${recipe.difficulty}`);
    lines.push('');

    // Core Metrics
    const doseText = dose > 0 ? formatWeight(dose, unitSystem) : '—';
    const waterText = recipe.total_water ? formatVolume(recipe.total_water, unitSystem) : '—';
    lines.push(`⚖️ *Ratio:* ${recipe.ratio || '1:15'} (${doseText} / ${waterText})`);

    const details: string[] = [];
    if (recipe.grind_size) details.push(`⚙️ Grind: ${recipe.grind_size}`);
    if (recipe.temperature) details.push(`🌡️ Temp: ${recipe.temperature}°C`);
    if (totalDuration > 0) details.push(`⏱️ Time: ~${formatDuration(totalDuration)}`);

    if (details.length > 0) {
        lines.push(details.join(' | '));
    }

    if (recipe.description_short) {
        lines.push(`📝 _${recipe.description_short}_`);
    }

    if (recipe.best_for_tags && recipe.best_for_tags.length > 0) {
        lines.push(`✨ *Best For:* ${recipe.best_for_tags.join(', ')}`);
    }

    if (recipe.philosophy) {
        lines.push(`💡 _"${recipe.philosophy}"_`);
    }

    // Steps with Valve & Instruction details
    if (brewSteps.length > 0) {
        lines.push('');
        lines.push('📋 *Brew Steps:*');
        let elapsed = 0;
        brewSteps.forEach((step, idx) => {
            const timeStr = formatDuration(elapsed);
            const weightStr = step.target_weight ? ` ➔ ${formatWeight(step.target_weight, unitSystem)}` : '';
            const valve = valveStates[idx];
            const valveStr = valve ? (valve === 'open' ? ' [🔓 Valve Open]' : ' [🔒 Valve Closed]') : '';

            lines.push(`${idx + 1}. *${timeStr}* — ${step.label}${weightStr}${valveStr}`);

            // Add detailed instruction if distinct from label
            if (step.instruction && step.instruction.trim() && step.instruction.trim().toLowerCase() !== step.label.trim().toLowerCase()) {
                lines.push(`   💬 _${step.instruction.trim()}_`);
            }

            elapsed += step.duration_seconds || 30;
        });
    }

    // Footer
    lines.push('');
    lines.push('☕ Brewed with CoffeeFlow');

    return lines.join('\n');
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    text.split(' ').forEach(word => {
        const last = lines[lines.length - 1];
        if (!last || ctx.measureText(`${last} ${word}`).width >= maxWidth) lines.push(word);
        else lines[lines.length - 1] = `${last} ${word}`;
    });
    return lines;
};

/**
 * Render a high-resolution 1080x1440 Recipe Card with Valve states, instructions, and metrics.
 */
export const renderRecipeCardBlob = async (
    recipe: Recipe,
    unitSystem: UnitSystem = 'metric'
): Promise<Blob> => {
    const width = 1080;
    const height = 1440;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Canvas 2D context not available');
    }

    const dose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
    const methodName = formatMethodName(recipe.method_id);
    const brewSteps = getBrewSteps(recipe.steps || []);
    const totalDuration = getBrewDuration(recipe.steps || []);
    const valveStates = getValveStates(brewSteps);
    const hasAnyValve = valveStates.some(v => v !== null);

    // 1. Background Gradient (Rich coffee dark theme)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#151210');
    bgGrad.addColorStop(0.4, '#1E1916');
    bgGrad.addColorStop(1, '#0F0C0A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative ambient glow in top right and bottom left
    const glow1 = ctx.createRadialGradient(width * 0.85, height * 0.12, 10, width * 0.85, height * 0.12, 480);
    glow1.addColorStop(0, 'rgba(212, 163, 115, 0.14)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.85, 10, width * 0.15, height * 0.85, 400);
    glow2.addColorStop(0, 'rgba(168, 120, 75, 0.08)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    const px = 64;
    let y = 72;

    // 2. Top Header Badges (Method, Style, Valve indicator, Brand)
    ctx.save();
    // Method Pill Tag
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    const methodTagW = ctx.measureText(methodName.toUpperCase()).width + 48;
    ctx.fillStyle = 'rgba(212, 163, 115, 0.2)';
    ctx.beginPath();
    ctx.roundRect(px, y, methodTagW, 44, 22);
    ctx.fill();

    ctx.fillStyle = '#E6BE94';
    ctx.fillText(methodName.toUpperCase(), px + 24, y + 29);

    let nextBadgeX = px + methodTagW + 12;

    // Valve Hybrid Indicator Pill
    if (hasAnyValve) {
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        const valveTagW = ctx.measureText('VALVE HYBRID').width + 40;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.beginPath();
        ctx.roundRect(nextBadgeX, y, valveTagW, 44, 22);
        ctx.fill();

        ctx.fillStyle = '#7DD3FC';
        ctx.fillText('VALVE HYBRID', nextBadgeX + 20, y + 29);
        nextBadgeX += valveTagW + 12;
    }

    // Style Tag Pill if present
    if (recipe.style) {
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        const styleText = recipe.style.toUpperCase();
        const styleW = ctx.measureText(styleText).width + 36;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(nextBadgeX, y, styleW, 44, 22);
        ctx.fill();

        ctx.fillStyle = '#C9C4BE';
        ctx.fillText(styleText, nextBadgeX + 18, y + 29);
    }

    // Top Right App Branding
    ctx.fillStyle = '#A39991';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('COFFEEFLOW', width - px, y + 30);
    ctx.textAlign = 'left';
    ctx.restore();

    y += 88;

    // 3. Recipe Title & Summary
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 58px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, recipe.name, width - px * 2);
    titleLines.slice(0, 2).forEach(line => {
        ctx.fillText(line, px, y);
        y += 68;
    });
    ctx.restore();

    if (recipe.description_short) {
        y += 2;
        ctx.save();
        ctx.fillStyle = '#A8A099';
        ctx.font = '400 25px system-ui, -apple-system, sans-serif';
        const descLines = wrapText(ctx, recipe.description_short, width - px * 2);
        descLines.slice(0, 2).forEach(line => {
            ctx.fillText(line, px, y);
            y += 34;
        });
        ctx.restore();
    }

    y += 28;

    // 4. Metric Bento Grid (5 Cards: Dose, Water, Ratio, Grind, Temp)
    const cardGap = 16;
    const cardW = (width - px * 2 - cardGap * 4) / 5;
    const cardH = 116;

    const metrics = [
        { label: 'DOSE', value: dose > 0 ? formatWeight(dose, unitSystem) : '—' },
        { label: 'WATER', value: recipe.total_water ? formatVolume(recipe.total_water, unitSystem) : '—' },
        { label: 'RATIO', value: recipe.ratio || '1:15' },
        { label: 'GRIND', value: recipe.grind_size || 'Med' },
        { label: 'TEMP', value: recipe.temperature ? `${recipe.temperature}°C` : '—' }
    ];

    metrics.forEach((m, idx) => {
        const cx = px + idx * (cardW + cardGap);
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(cx, y, cardW, cardH, 18);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#9C948D';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(m.label, cx + 16, y + 34);

        // Value
        ctx.fillStyle = '#F5EFEB';
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.fillText(m.value, cx + 16, y + 80);
        ctx.restore();
    });

    y += cardH + 36;

    // 5. Timeline / Steps Section Header
    ctx.save();
    ctx.fillStyle = '#E8E2DC';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('BREW TIMELINE & INSTRUCTIONS', px, y);

    if (totalDuration > 0) {
        ctx.fillStyle = '#D4A373';
        ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`TOTAL TIME ~${formatDuration(totalDuration)}`, width - px, y);
        ctx.textAlign = 'left';
    }
    ctx.restore();

    y += 24;

    // Steps list card container
    const stepsBoxH = 630;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(px, y, width - px * 2, stepsBoxH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Render individual steps inside container
    const displaySteps = brewSteps.slice(0, 6);
    const stepRowH = (stepsBoxH - 36) / Math.max(1, displaySteps.length);
    let stepY = y + 24;
    let elapsedSec = 0;

    displaySteps.forEach((step, idx) => {
        const valve = valveStates[idx];

        // 1. Time pill
        ctx.fillStyle = 'rgba(212, 163, 115, 0.15)';
        ctx.beginPath();
        ctx.roundRect(px + 20, stepY, 96, 38, 10);
        ctx.fill();

        ctx.fillStyle = '#E6BE94';
        ctx.font = 'bold 18px system-ui, -apple-system, monospace';
        ctx.fillText(formatDuration(elapsedSec), px + 36, stepY + 25);

        // 2. Step Label
        ctx.fillStyle = '#F5EFEB';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText(step.label, px + 130, stepY + 26);

        // 3. Valve State Pill (if present on this step)
        let labelOffset = ctx.measureText(step.label).width + 16;
        if (valve === 'open') {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
            ctx.beginPath();
            ctx.roundRect(px + 130 + labelOffset, stepY + 4, 130, 30, 8);
            ctx.fill();

            ctx.fillStyle = '#4ADE80';
            ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
            ctx.fillText('VALVE OPEN', px + 144 + labelOffset, stepY + 24);
        } else if (valve === 'closed') {
            ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
            ctx.beginPath();
            ctx.roundRect(px + 130 + labelOffset, stepY + 4, 140, 30, 8);
            ctx.fill();

            ctx.fillStyle = '#FB923C';
            ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
            ctx.fillText('VALVE CLOSED', px + 144 + labelOffset, stepY + 24);
        }

        // 4. Target Weight (Right aligned)
        if (step.target_weight) {
            ctx.fillStyle = '#F5EFEB';
            ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatWeight(step.target_weight, unitSystem), width - px - 28, stepY + 26);
            ctx.textAlign = 'left';
        }

        // 5. Instruction line underneath (sub-text)
        if (step.instruction && step.instruction.trim()) {
            ctx.fillStyle = '#9C948D';
            ctx.font = '400 17px system-ui, -apple-system, sans-serif';
            const cleanInstr = step.instruction.trim();
            // Truncate if too long to prevent overflow
            const displayInstr = cleanInstr.length > 85 ? `${cleanInstr.slice(0, 82)}...` : cleanInstr;
            ctx.fillText(displayInstr, px + 130, stepY + 56);
        }

        elapsedSec += step.duration_seconds || 30;
        stepY += stepRowH;
    });

    if (brewSteps.length > 6) {
        ctx.fillStyle = '#A39991';
        ctx.font = 'italic 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(`+ ${brewSteps.length - 6} more steps in CoffeeFlow`, px + 28, y + stepsBoxH - 18);
    }
    ctx.restore();

    // 6. Bottom Brand Bar & Best For Beans tags
    const footerY = height - 76;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, footerY - 20);
    ctx.lineTo(width - px, footerY - 20);
    ctx.stroke();

    ctx.fillStyle = '#D4A373';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('CoffeeFlow', px, footerY + 20);

    if (recipe.best_for_tags && recipe.best_for_tags.length > 0) {
        ctx.fillStyle = '#8E857E';
        ctx.font = '500 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Best for: ${recipe.best_for_tags.slice(0, 3).join(' • ')}`, px + 144, footerY + 20);
    } else {
        ctx.fillStyle = '#7E766F';
        ctx.font = '400 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('Craft Every Cup • Personal Coffee Companion', px + 144, footerY + 20);
    }

    if (recipe.difficulty) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#B8AFA7';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${recipe.difficulty.toUpperCase()} LEVEL`, width - px, footerY + 20);
        ctx.textAlign = 'left';
    }
    ctx.restore();

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create canvas blob'));
        }, 'image/png');
    });
};

export const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const tryNativeShare = async (data: ShareData): Promise<boolean> => {
    if (!navigator.share || (data.files && (!navigator.canShare || !navigator.canShare({ files: data.files })))) {
        return false;
    }
    try {
        await navigator.share(data);
        return true;
    } catch (err: unknown) {
        return err instanceof Error && err.name === 'AbortError';
    }
};

export const downloadRecipeCard = async (recipe: Recipe, unitSystem: UnitSystem = 'metric'): Promise<void> => {
    const blob = await renderRecipeCardBlob(recipe, unitSystem);
    downloadBlob(blob, `${recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_recipe.png`);
};

export const shareRecipeCard = async (
    recipe: Recipe,
    unitSystem: UnitSystem = 'metric'
): Promise<'shared' | 'downloaded'> => {
    const blob = await renderRecipeCardBlob(recipe, unitSystem);
    const fileName = `${recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_recipe.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    const shared = await tryNativeShare({
        title: recipe.name,
        text: `${recipe.name} • Brew recipe from CoffeeFlow`,
        files: [file]
    });

    if (!shared) downloadBlob(blob, fileName);
    return shared ? 'shared' : 'downloaded';
};

export const shareOrCopyRecipeText = async (
    recipe: Recipe,
    unitSystem: UnitSystem = 'metric'
): Promise<'shared' | 'copied'> => {
    const text = formatRecipeShareText(recipe, unitSystem);
    const shared = await tryNativeShare({ title: recipe.name, text });
    if (!shared) await navigator.clipboard.writeText(text);
    return shared ? 'shared' : 'copied';
};
