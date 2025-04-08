import { fetchAPI } from './config.js';
import { showError, showSuccess } from './notifications.js';

export async function loadPrinters() {
    try {
        const printers = await fetchAPI('/printers/');
        const printersTable = document.getElementById('printers-table')?.querySelector('tbody');
        
        if (!printersTable) {
            console.error('Printers table not found');
            return;
        }

        if (printers && Array.isArray(printers)) {
            printersTable.innerHTML = printers.map(printer => `
                <tr>
                    <td>${printer.id || ''}</td>
                    <td>${printer.name || 'Unnamed Printer'}</td>
                    <td>
                        <span class="status-badge status-${printer.status || 'idle'}">
                            ${printer.status || 'idle'}
                        </span>
                    </td>
                    <td>${(printer.total_print_time || 0).toFixed(1)} hrs</td>
                    <td>
                        <button class="btn btn-secondary" onclick="window.editPrinter(${printer.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="window.deletePrinter(${printer.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `).join('');

            // Добавим стили для статусов, если их еще нет
            if (!document.getElementById('printer-status-styles')) {
                const styles = document.createElement('style');
                styles.id = 'printer-status-styles';
                styles.textContent = `
                    .status-badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.9em;
                        font-weight: 500;
                    }
                    .status-idle { background: #4caf50; color: white; }
                    .status-printing { background: #2196f3; color: white; }
                    .status-paused { background: #ff9800; color: white; }
                    .status-error { background: #f44336; color: white; }
                `;
                document.head.appendChild(styles);
            }
        } else {
            showError('Invalid printer data received');
        }
    } catch (error) {
        console.error('Error loading printers:', error);
        showError('Failed to load printers');
    }
}

export async function loadModels() {
    try {
        const models = await fetchAPI('/models/');
        const modelsTable = document.getElementById('models-table')?.querySelector('tbody');
        
        if (!modelsTable) {
            console.error('Models table not found');
            return;
        }

        if (models && Array.isArray(models)) {
            modelsTable.innerHTML = models.map(model => `
                <tr>
                    <td>${model.id || ''}</td>
                    <td>${model.name || 'Unnamed Model'}</td>
                    <td>${(model.printing_time || 0).toFixed(1)} hrs</td>
                    <td>
                        <button class="btn btn-secondary" onclick="window.editModel(${model.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="window.deleteModel(${model.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            showError('Invalid model data received');
        }
    } catch (error) {
        console.error('Error loading models:', error);
        showError('Failed to load models');
    }
}

export async function loadActivePrintings() {
    try {
        const printings = await fetchAPI('/printings/');
        const activePrintings = printings.filter(p => !p.real_time_stop);
        const activePrintingCards = document.getElementById('active-printing-cards');
        
        if (!activePrintingCards) {
            console.error('Active printing cards container not found');
            return;
        }

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
    } catch (error) {
        console.error('Error loading active printings:', error);
        showError('Failed to load active printings');
    }
}

export async function loadPrintingsHistory() {
    try {
        const printings = await fetchAPI('/printings/');
        const completedPrintings = printings.filter(p => p.real_time_stop);
        const printingsTable = document.getElementById('printings-table')?.querySelector('tbody');
        
        if (!printingsTable) {
            console.error('Printings table not found');
            return;
        }

        printingsTable.innerHTML = completedPrintings.map(printing => `
            <tr>
                <td>${printing.id}</td>
                <td>${printing.printer_name || 'Unknown Printer'}</td>
                <td>${printing.model_name || 'Unknown Model'}</td>
                <td>${new Date(printing.start_time).toLocaleString()}</td>
                <td>${new Date(printing.real_time_stop).toLocaleString()}</td>
                <td>${((new Date(printing.real_time_stop) - new Date(printing.start_time)) / (1000 * 60 * 60)).toFixed(1)} hrs</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading printing history:', error);
        showError('Failed to load printing history');
    }
}

// Добавляем функцию автообновления
export function startPrintingUpdates() {
    // Останавливаем предыдущий интервал, если он существует
    if (window.printingUpdateInterval) {
        clearInterval(window.printingUpdateInterval);
    }

    // Создаем новый интервал обновления
    window.printingUpdateInterval = setInterval(async () => {
        const printingsSection = document.getElementById('printings');
        // Обновляем только если секция печати активна
        if (printingsSection?.classList.contains('active')) {
            try {
                const printings = await fetchAPI('/printings/');
                const activePrintings = printings.filter(p => !p.real_time_stop);
                const completedPrintings = printings.filter(p => p.real_time_stop);
                
                // Обновляем активные печати
                updateActivePrintingCards(activePrintings);
                // Обновляем историю печати
                updatePrintingHistory(completedPrintings);
            } catch (error) {
                console.error('Error updating printings:', error);
            }
        }
    }, 3000); // Обновляем каждые 3 секунды
}

function updateActivePrintingCards(activePrintings) {
    const container = document.getElementById('active-printing-cards');
    if (!container) return;

    container.innerHTML = activePrintings.map(printing => `
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

function updatePrintingHistory(completedPrintings) {
    const table = document.getElementById('printings-table')?.querySelector('tbody');
    if (!table) return;

    table.innerHTML = completedPrintings.map(printing => `
        <tr>
            <td>${printing.id}</td>
            <td>${printing.printer_name || 'Unknown Printer'}</td>
            <td>${printing.model_name || 'Unknown Model'}</td>
            <td>${new Date(printing.start_time).toLocaleString()}</td>
            <td>${new Date(printing.real_time_stop).toLocaleString()}</td>
            <td>${((new Date(printing.real_time_stop) - new Date(printing.start_time)) / (1000 * 60 * 60)).toFixed(1)} hrs</td>
        </tr>
    `).join('');
}

// ...existing code...

export function startAutoUpdate() {
    // Обновляем каждые 3 секунды
    setInterval(async () => {
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
                case 'printings':
                    const [printings, printers] = await Promise.all([
                        fetchAPI('/printings/'),
                        fetchAPI('/printers/')
                    ]);
                    
                    // Обновляем активные печати
                    const activePrintings = printings.filter(p => !p.real_time_stop);
                    const activePrintingCards = document.getElementById('active-printing-cards');
                    if (activePrintingCards) {
                        activePrintingCards.innerHTML = activePrintings.map(printing => {
                            const printer = printers.find(p => p.id === printing.printer_id);
                            return `
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
                                            <span><i class="fas fa-print"></i> ${printer?.name || 'Unknown printer'}</span>
                                            <span><i class="fas fa-clock"></i> ${printing.printing_time.toFixed(1)} hrs</span>
                                        </div>
                                        <span class="status-badge status-${printer?.status || 'printing'}">
                                            ${printer?.status || 'printing'}
                                        </span>
                                    </div>
                                    <div class="printing-actions">
                                        ${printer?.status === 'paused' 
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
                            `;
                        }).join('');
                    }
                    
                    // Обновляем историю печати
                    const completedPrintings = printings.filter(p => p.real_time_stop);
                    updatePrintingHistory(completedPrintings);
                    break;
            }
        } catch (error) {
            console.error('Error in auto-update:', error);
        }
    }, 3000);
}

// ...existing code...
