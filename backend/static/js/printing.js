import { fetchAPI } from './config.js';
import { showError, showSuccess } from './notifications.js';

export async function pausePrinting(printingId) {
    try {
        await fetchAPI(`/printings/${printingId}/pause`, { method: 'POST' });
        showSuccess('Printing paused successfully');
    } catch (error) {
        showError('Failed to pause printing');
    }
}

export async function resumePrinting(printingId) {
    try {
        await fetchAPI(`/printings/${printingId}/resume`, { method: 'POST' });
        showSuccess('Printing resumed successfully');
    } catch (error) {
        showError('Failed to resume printing');
    }
}

export async function stopPrinting(printingId) {
    try {
        await fetchAPI(`/printings/${printingId}/complete`, { method: 'POST' });
        showSuccess('Printing completed successfully');
    } catch (error) {
        showError('Failed to stop printing');
    }
}

// Add more printing-related functions as needed
