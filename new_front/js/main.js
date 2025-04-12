import { setupNavigation } from './ui.js';
import { loadDashboardData } from './dashboard.js';
import { loadPrinters, loadModels, loadActivePrintings, loadPrintingsHistory, startAutoUpdate } from './data.js';
import { showError, showSuccess } from './notifications.js';
import './charts.js';
import './reports.js';
import './printing.js';
import { generateDailyReport, generatePrinterReport, generateModelReport, populateReportSelects, setupGeneralReportModal } from './reports.js';
import { initGCodeViewer } from './gcode-3d-viewer.js';
import { setupAllModals } from './modals.js';
import { initThemeSystem } from './theme.js';

/**
 * Инициализация приложения
 * Вызывается после загрузки всех компонентов и модулей
 */
export function initializeApp() {
    console.log('Инициализация приложения...');
    
    // Инициализируем систему тем
    initThemeSystem();
    
    // Установка обработчиков для системных событий
    setupEventListeners();
    
    // Настройка навигации и модальных окон
    setupNavigation();
    setupAllModals(); // Используем новую функцию для модальных окон
    setupGeneralReportModal(); // Настраиваем модальное окно общего отчета
    
    // Загрузка данных
    loadApplicationData();
    
    // Инициализируем селекты для отчетов
    populateReportSelects();
    
    // Установка текущей даты в поле выбора для ежедневного отчета
    const dailyReportDate = document.getElementById('daily-report-date');
    if (dailyReportDate) {
        dailyReportDate.value = new Date().toISOString().split('T')[0];
    }
    
    // Запускаем автообновление данных
    startAutoUpdate();
    
    // Инициализируем просмотрщик G-code
    initGCodeViewer();
    
    console.log('Инициализация приложения завершена');
}

/**
 * Устанавливает обработчики событий для интерфейса
 */
function setupEventListeners() {
    console.log('Установка обработчиков событий');
    
    // Обработчики для кнопок отчетов
    setupReportButtons();
    
    // Обработчики для навигации
    setupNavigationEvents();
    
    // Обработчик для кнопки обновления
    setupRefreshButton();
    
    // Обработчик для загрузки GCode файлов
    setupGCodeFileInput();
    
    // Заглушка для планировщика
    setupScheduler();
}

/**
 * Настраивает обработчики для кнопок отчетов
 */
function setupReportButtons() {
    const generateDailyReportBtn = document.getElementById('generate-daily-report');
    if (generateDailyReportBtn) {
        console.log('Добавление обработчика для кнопки ежедневного отчета');
        generateDailyReportBtn.addEventListener('click', generateDailyReport);
    }
    
    const generatePrinterReportBtn = document.getElementById('generate-printer-report');
    if (generatePrinterReportBtn) {
        console.log('Добавление обработчика для кнопки отчета по принтеру');
        generatePrinterReportBtn.addEventListener('click', generatePrinterReport);
    }
    
    const generateModelReportBtn = document.getElementById('generate-model-report');
    if (generateModelReportBtn) {
        console.log('Добавление обработчика для кнопки отчета по модели');
        generateModelReportBtn.addEventListener('click', generateModelReport);
    }
}

/**
 * Настраивает обработчики для навигационных элементов
 */
function setupNavigationEvents() {
    const navItems = document.querySelectorAll('.nav-menu li');
    console.log(`Найдено ${navItems.length} элементов навигации`);
    
    navItems.forEach(item => {
        console.log(`Добавление обработчика клика для элемента навигации: ${item.getAttribute('data-section')}`);
        item.addEventListener('click', () => {
            // Скрываем все секции
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });

            // Показываем выбранную секцию
            const sectionId = item.getAttribute('data-section');
            const sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                sectionElement.classList.add('active');
            } else {
                console.error(`Секция с ID ${sectionId} не найдена`);
            }

            // Обновляем активный пункт навигации
            navItems.forEach(navItem => {
                navItem.classList.remove('active');
            });
            item.classList.add('active');

            // Загружаем данные секции при необходимости
            if (sectionId === 'dashboard') {
                loadDashboardData();
            }
        });
    });
}

/**
 * Настраивает кнопку обновления данных
 */
function setupRefreshButton() {
    const refreshButton = document.querySelector('.section-actions .btn-secondary');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection?.id === 'dashboard') {
                loadDashboardData();
            }
        });
    }
}

/**
 * Настраивает обработчик для загрузки GCode файлов
 */
function setupGCodeFileInput() {
    const gcodeFileInput = document.getElementById('gcode-file');
    if (gcodeFileInput) {
        console.log('Добавление обработчика для загрузки GCode файлов');
        gcodeFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('Loading GCode file:', file.name);
                // В реальном приложении здесь будет парсинг и отображение GCode
            }
        });
    }
}

/**
 * Настраивает заглушку для планировщика
 */
function setupScheduler() {
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    if (addScheduleBtn) {
        console.log('Добавление обработчика для кнопки планировщика');
        addScheduleBtn.addEventListener('click', () => {
            showSuccess('Функция планирования будет доступна в будущих обновлениях!');
        });
    }
}

/**
 * Загружает основные данные приложения
 */
function loadApplicationData() {
    console.log('Загрузка данных приложения');
    
    // Загружаем все необходимые данные
    loadDashboardData();
    loadPrinters();
    loadModels();
    loadActivePrintings();
    loadPrintingsHistory();
}

// Устаревший метод инициализации - оставлен для обратной совместимости
document.addEventListener('DOMContentLoaded', () => {
    console.log('Предупреждение: используется устаревший метод инициализации через DOMContentLoaded');
    // Ничего не делаем, так как теперь используется initializeApp()
});
