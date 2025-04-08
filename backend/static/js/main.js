import { setupNavigation, setupModals } from './ui.js';
import { loadDashboardData } from './dashboard.js';
import { loadPrinters, loadModels, loadActivePrintings, loadPrintingsHistory, startAutoUpdate } from './data.js';
import { showError, showSuccess } from '/static/js/notifications.js';
import '/static/js/charts.js';
import '/static/js/reports.js';
import '/static/js/printing.js';
import { generateDailyReport, generatePrinterReport, generateModelReport, populateReportSelects, setupGeneralReportModal } from './reports.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupModals();
    setupGeneralReportModal(); // Настраиваем модальное окно общего отчета
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

    // Add event listeners for navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });

            // Show selected section
            const sectionId = item.dataset.section;
            document.getElementById(sectionId)?.classList.add('active');

            // Update active navigation item
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            item.classList.add('active');

            // Load section data if needed
            if (sectionId === 'dashboard') {
                loadDashboardData();
            }
        });
    });

    // Add refresh button handler
    document.querySelector('.section-actions .btn-secondary')?.addEventListener('click', () => {
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection?.id === 'dashboard') {
            loadDashboardData();
        }
    });
});
