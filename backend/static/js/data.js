import { TableManager } from './table-manager.js';
import { fetchAPI } from './config.js';
import { showError, showSuccess } from './notifications.js';
import { loadDashboardData } from './dashboard.js';

class PrintersTableManager extends TableManager {
    formatTableRows(printers) {
        return printers.map(printer => `
            <tr>
                <td>${printer.id || ''}</td>
                <td>${printer.name}</td>
                <td>
                    <span class="status-badge status-${printer.status.toLowerCase()}">
                        ${printer.status}
                    </span>
                </td>
                <td>${printer.total_print_time?.toFixed(2) || '0.00'} hrs</td>
                <td>${printer.total_downtime?.toFixed(2) || '0.00'} hrs</td>
                <td>
                    <button class="btn btn-icon" onclick="window.editPrinter('${printer.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon" onclick="window.deletePrinter('${printer.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

class ModelsTableManager extends TableManager {
    formatTableRows(models) {
        return models.map(model => `
            <tr>
                <td>${model.id || ''}</td>
                <td>${model.name || 'Unnamed Model'}</td>
                <td>${(model.printing_time || 0).toFixed(1)} hrs</td>
                <td>
                    <button class="btn btn-icon" onclick="window.editModel('${model.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon" onclick="window.deleteModel('${model.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

class PrintingsHistoryTableManager extends TableManager {
    formatTableRows(printings) {
        return printings.map(printing => `
            <tr>
                <td>${printing.id}</td>
                <td>${printing.printer_name || 'Unknown Printer'}</td>
                <td>${printing.model_name || 'Unknown Model'}</td>
                <td>${new Date(printing.start_time).toLocaleString()}</td>
                <td>${printing.real_time_stop ? new Date(printing.real_time_stop).toLocaleString() : 'In progress'}</td>
                <td>${this.formatDuration(printing)}</td>
            </tr>
        `).join('');
    }

    formatDuration(printing) {
        if (!printing.real_time_stop) return 'N/A';
        const duration = (new Date(printing.real_time_stop) - new Date(printing.start_time)) / (1000 * 60 * 60);
        return `${duration.toFixed(1)} hrs`;
    }
}

// Инициализация таблиц
const printersTable = new PrintersTableManager('printers-table', { itemsPerPage: 10 });
const modelsTable = new ModelsTableManager('models-table', { itemsPerPage: 10 });
const printingsHistoryTable = new PrintingsHistoryTableManager('printings-table', { itemsPerPage: 10 });

// Функции загрузки данных
export async function loadPrinters() {
    try {
        const printers = await fetchAPI('/printers/');
        printersTable.setData(printers);
    } catch (error) {
        showError('Failed to load printers');
        console.error(error);
    }
}

export async function loadModels() {
    try {
        await modelsTable.loadData();
    } catch (error) {
        console.error('Error loading models:', error);
        showError('Failed to load models');
    }
}

export async function loadActivePrintings() {
    try {
        const printings = await fetchAPI('/printings/');
        const activePrintings = printings.filter(p => !p.real_time_stop);
        renderActivePrintingCards(activePrintings);
    } catch (error) {
        console.error('Error loading active printings:', error);
        showError('Failed to load active printings');
    }
}

function renderActivePrintingCards(activePrintings) {
    const activePrintingCards = document.getElementById('active-printing-cards');
    
    if (!activePrintingCards) return;

    activePrintingCards.innerHTML = activePrintings.map(printing => `
        <div class="printing-card" data-printing-id="${printing.id}">
            <div class="printing-header">
                <span class="printing-title">${printing.model_name || 'Unknown model'}</span>
                <span class="printing-time">${new Date(printing.start_time).toLocaleString()}</span>
            </div>
            <div class="printing-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${printing.progress || 0}%"></div>
                </div>
                <span class="progress-text">${Math.round(printing.progress || 0)}%</span>
            </div>
            <div class="printing-info">
                <div>
                    <span><i class="fas fa-print"></i> ${printing.printer_name || 'Unknown printer'}</span>
                    <span><i class="fas fa-clock"></i> ${printing.printing_time.toFixed(1)} hrs</span>
                </div>
                <span class="status-badge status-${printing.status || 'printing'}">
                    ${printing.status || 'printing'}
                </span>
            </div>
            <div class="printing-actions">
                ${printing.status === 'paused' 
                    ? `<button class="btn btn-success" onclick="window.resumePrinting(${printing.id})">
                        <i class="fas fa-play"></i> Resume
                       </button>`
                    : `<button class="btn btn-warning" onclick="window.pausePrinting(${printing.id})">
                        <i class="fas fa-pause"></i> Pause
                       </button>`
                }
                <button class="btn btn-danger" onclick="window.stopPrinting(${printing.id})">
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
        </div>
    `).join('');
}

export async function loadPrintingsHistory() {
    try {
        await printingsHistoryTable.loadData();
    } catch (error) {
        console.error('Error loading printing history:', error);
        showError('Failed to load printing history');
    }
}

// Автообновление данных
export function startPrintingUpdates() {
    if (window.printingUpdateInterval) {
        clearInterval(window.printingUpdateInterval);
    }

    window.printingUpdateInterval = setInterval(async () => {
        const printingsSection = document.getElementById('printings');
        if (printingsSection?.classList.contains('active')) {
            try {
                await Promise.all([loadActivePrintings(), loadPrintingsHistory()]);
            } catch (error) {
                console.error('Error updating printings:', error);
            }
        }
    }, 3000);
}

export function startAutoUpdate() {
    if (window.autoUpdateInterval) {
        clearInterval(window.autoUpdateInterval);
    }

    window.autoUpdateInterval = setInterval(async () => {
        const activeSection = document.querySelector('.content-section.active');
        if (!activeSection) return;

        try {
            switch (activeSection.id) {
                case 'dashboard':
                    await loadDashboardData();
                    break;
                case 'printers':
                    await loadPrinters();
                    break;
                case 'models':
                    await loadModels();
                    break;
                case 'printings':
                    await Promise.all([loadActivePrintings(), loadPrintingsHistory()]);
                    break;
            }
        } catch (error) {
            console.error('Error in auto-update:', error);
        }
    }, 3000);
}

// Инициализация фильтров для карточек печати
function initializePrintingFilters() {
    const searchInput = document.getElementById('active-printings-search');
    const statusFilter = document.getElementById('active-printings-status-filter');

    const filterCards = () => {
        const searchTerm = (searchInput?.value || '').toLowerCase();
        const statusValue = (statusFilter?.value || 'all').toLowerCase();
        
        document.querySelectorAll('.printing-card').forEach(card => {
            const title = (card.querySelector('.printing-title')?.textContent || '').toLowerCase();
            const printer = (card.querySelector('.printing-info span:first-child')?.textContent || '').toLowerCase();
            const status = (card.querySelector('.status-badge')?.textContent || '').toLowerCase();
            
            const matchesSearch = title.includes(searchTerm) || printer.includes(searchTerm);
            const matchesStatus = statusValue === 'all' || status === statusValue;
            
            card.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
        });
    };

    searchInput?.addEventListener('input', filterCards);
    statusFilter?.addEventListener('change', filterCards);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initializePrintingFilters();
});