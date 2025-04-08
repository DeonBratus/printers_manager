import { setupNavigation, setupModals } from './ui.js';
import { loadDashboardData } from './dashboard.js';
import { loadPrinters, loadModels, loadActivePrintings, loadPrintingsHistory, startAutoUpdate } from './data.js';
import { showError, showSuccess } from '/static/js/notifications.js';
import '/static/js/charts.js';
import '/static/js/reports.js';
import '/static/js/printing.js';
import { generateDailyReport, generatePrinterReport, generateModelReport, populateReportSelects } from './reports.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupModals();
    loadDashboardData();
    loadPrinters();
    loadModels();
    loadActivePrintings();
    loadPrintingsHistory();
    
    // Инициализируем селекты для отчетов
    populateReportSelects();
    
    const dailyReportDate = document.getElementById('daily-report-date');
    if (dailyReportDate) {
        dailyReportDate.value = new Date().toISOString().split('T')[0];
    }
    
    document.getElementById('generate-daily-report')?.addEventListener('click', generateDailyReport);
    document.getElementById('generate-printer-report')?.addEventListener('click', generatePrinterReport);
    document.getElementById('generate-model-report')?.addEventListener('click', generateModelReport);

    // Запускаем автообновление данных
    startAutoUpdate();
});
