import { fetchAPI } from './config.js';
import { loadDashboardData } from './dashboard.js';
import { loadPrinters, loadModels, loadActivePrintings, loadPrintingsHistory, startPrintingUpdates } from './data.js';
import { generateDailyReport, generatePrinterReport, generateModelReport } from './reports.js';
import { showError, showSuccess } from './notifications.js';

// Сделаем функции доступными глобально
window.handlePrinterFormSubmit = async function(event) {
    event.preventDefault();
    const printerName = document.getElementById('printer-name').value;
    try {
        await fetchAPI('/printers/', {
            method: 'POST',
            body: JSON.stringify({ name: printerName })
        });
        document.getElementById('add-printer-modal').classList.remove('active');
        loadPrinters();
        showSuccess('Printer added successfully');
    } catch (error) {
        showError('Failed to add printer');
    }
};

window.handleModelFormSubmit = async function(event) {
    event.preventDefault();
    const modelName = document.getElementById('model-name').value;
    const printingTime = document.getElementById('printing-time').value;
    try {
        await fetchAPI('/models/', {
            method: 'POST',
            body: JSON.stringify({
                name: modelName,
                printing_time: parseFloat(printingTime)
            })
        });
        document.getElementById('add-model-modal').classList.remove('active');
        loadModels();
        showSuccess('Model added successfully');
    } catch (error) {
        showError('Failed to add model');
    }
};

export async function loadPrinterModelSelects() {
    try {
        const [printers, models] = await Promise.all([
            fetchAPI('/printers/'),
            fetchAPI('/models/')
        ]);
        
        const printerSelect = document.getElementById('printing-printer');
        const modelSelect = document.getElementById('printing-model');
        
        if (printerSelect && modelSelect) {
            // Фильтруем только свободные принтеры
            printerSelect.innerHTML = printers
                .filter(printer => printer.status === 'idle')
                .map(printer => `
                    <option value="${printer.id}">${printer.name}</option>
                `).join('');
                
            modelSelect.innerHTML = models.map(model => `
                <option value="${model.id}">${model.name} (${model.printing_time}h)</option>
            `).join('');
        }
    } catch (error) {
        showError('Failed to load printers and models');
    }
}

window.handlePrintingFormSubmit = async function(event) {
    event.preventDefault();
    const printerId = parseInt(document.getElementById('printing-printer').value);
    const modelId = parseInt(document.getElementById('printing-model').value);
    
    if (!printerId || !modelId) {
        showError('Please select both printer and model');
        return;
    }

    try {
        console.log('Starting print job...'); // Отладочный лог
        const selectedModel = await fetchAPI(`/models/${modelId}`);
        const startTime = new Date();
        const calculatedTimeStop = new Date(startTime.getTime() + selectedModel.printing_time * 60 * 60 * 1000);
        
        console.log('Sending print request...', { // Отладочный лог
            printer_id: printerId,
            model_id: modelId,
            printing_time: selectedModel.printing_time,
            start_time: startTime.toISOString(),
            calculated_time_stop: calculatedTimeStop.toISOString()
        });

        await fetchAPI('/printings/', {
            method: 'POST',
            body: JSON.stringify({
                printer_id: printerId,
                model_id: modelId,
                printing_time: selectedModel.printing_time,
                start_time: startTime.toISOString(),
                calculated_time_stop: calculatedTimeStop.toISOString()
            })
        });

        document.getElementById('start-printing-modal').classList.remove('active');
        showSuccess('Printing started successfully');
        await loadActivePrintings();
        await loadPrinters(); // Обновляем список принтеров после запуска печати
    } catch (error) {
        console.error('Error starting printing:', error);
        showError('Failed to start printing');
    }
};

// Сделаем функции управления печатью глобальными
window.pausePrinting = async function(printingId) {
    try {
        await fetchAPI(`/printings/${printingId}/pause`, { method: 'POST' });
        showSuccess('Printing paused successfully');
        loadActivePrintings();
    } catch (error) {
        showError('Failed to pause printing');
    }
};

window.resumePrinting = async function(printingId) {
    try {
        await fetchAPI(`/printings/${printingId}/resume`, { method: 'POST' });
        showSuccess('Printing resumed successfully');
        loadActivePrintings();
    } catch (error) {
        showError('Failed to resume printing');
    }
};

window.stopPrinting = async function(printingId) {
    try {
        await fetchAPI(`/printings/${printingId}/complete`, { method: 'POST' });
        showSuccess('Printing completed successfully');
        loadActivePrintings();
        loadPrintingsHistory();
    } catch (error) {
        showError('Failed to stop printing');
    }
};

// Экспортируем функции настройки
export function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-menu li');
    const contentSections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            item.classList.add('active');
            const sectionId = item.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // Немедленно загружаем данные при переключении вкладки
            switch (sectionId) {
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
                    startPrintingUpdates(); // Запускаем автообновление при переходе на вкладку
                    break;
            }
        });
    });
}

export function setupModals() {
    const addPrinterBtn = document.getElementById('add-printer-btn');
    const addModelBtn = document.getElementById('add-model-btn');
    const startPrintingBtn = document.getElementById('start-printing-btn');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const printerForm = document.getElementById('printer-form');
    const modelForm = document.getElementById('model-form');
    const printingForm = document.getElementById('printing-form');
    const generateDailyReportBtn = document.getElementById('generate-daily-report');
    const generatePrinterReportBtn = document.getElementById('generate-printer-report');
    const generateModelReportBtn = document.getElementById('generate-model-report');

    addPrinterBtn?.addEventListener('click', () => {
        document.getElementById('add-printer-modal').classList.add('active');
    });

    addModelBtn?.addEventListener('click', () => {
        document.getElementById('add-model-modal').classList.add('active');
    });

    startPrintingBtn?.addEventListener('click', () => {
        loadPrinterModelSelects();
        document.getElementById('start-printing-modal').classList.add('active');
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => 
                modal.classList.remove('active'));
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    printerForm?.addEventListener('submit', handlePrinterFormSubmit);
    modelForm?.addEventListener('submit', handleModelFormSubmit);
    printingForm?.addEventListener('submit', handlePrintingFormSubmit);
    generateDailyReportBtn?.addEventListener('click', generateDailyReport);
    generatePrinterReportBtn?.addEventListener('click', generatePrinterReport);
    generateModelReportBtn?.addEventListener('click', generateModelReport);
}

// Добавляем функции редактирования и удаления
window.editPrinter = async function(printerId) {
    try {
        const printer = await fetchAPI(`/printers/${printerId}`);
        const newName = prompt('Enter new printer name:', printer.name);
        if (newName && newName !== printer.name) {
            await fetchAPI(`/printers/${printerId}`, {
                method: 'PUT',
                body: JSON.stringify({ ...printer, name: newName })
            });
            loadPrinters();
            showSuccess('Printer updated successfully');
        }
    } catch (error) {
        showError('Failed to update printer');
    }
};

window.deletePrinter = async function(printerId) {
    if (confirm('Are you sure you want to delete this printer?')) {
        try {
            await fetchAPI(`/printers/${printerId}`, { method: 'DELETE' });
            loadPrinters();
            showSuccess('Printer deleted successfully');
        } catch (error) {
            showError('Failed to delete printer');
        }
    }
};

window.editModel = async function(modelId) {
    try {
        const model = await fetchAPI(`/models/${modelId}`);
        const newName = prompt('Enter new model name:', model.name);
        const newTime = prompt('Enter new printing time (hours):', model.printing_time);
        if (newName && newTime) {
            await fetchAPI(`/models/${modelId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: newName,
                    printing_time: parseFloat(newTime)
                })
            });
            loadModels();
            showSuccess('Model updated successfully');
        }
    } catch (error) {
        showError('Failed to update model');
    }
};

window.deleteModel = async function(modelId) {
    if (confirm('Are you sure you want to delete this model?')) {
        try {
            await fetchAPI(`/models/${modelId}`, { method: 'DELETE' });
            loadModels();
            showSuccess('Model deleted successfully');
        } catch (error) {
            showError('Failed to delete model');
        }
    }
};
