import { loadPrinterModelSelects } from './ui.js';

/**
 * Настраивает все модальные окна и их обработчики событий
 */
export function setupAllModals() {
    console.log('Настройка модальных окон...');

    // Настройка модального окна для добавления принтера
    setupModal('add-printer-btn', 'add-printer-modal', 'add-printer-form');
    
    // Настройка модального окна для добавления модели
    setupModal('add-model-btn', 'add-model-modal', 'add-model-form');
    
    // Настройка модального окна для начала печати с загрузкой селектов принтеров и моделей
    setupModal('start-printing-btn', 'start-printing-modal', 'start-printing-form', loadPrinterModelSelects);
    
    // Настройка модального окна для общего отчета
    setupModal('open-general-report-btn', 'general-report-modal');
    
    console.log('Настройка модальных окон завершена');
}

/**
 * Настраивает отдельное модальное окно и его компоненты
 * @param {string} buttonId - ID кнопки, открывающей модальное окно
 * @param {string} modalId - ID модального окна
 * @param {string} formId - ID формы внутри модального окна (опционально)
 * @param {Function} openCallback - Функция обратного вызова при открытии модального окна (опционально)
 */
function setupModal(buttonId, modalId, formId = null, openCallback = null) {
    const openButton = document.getElementById(buttonId);
    const modal = document.getElementById(modalId);
    
    if (!openButton) {
        console.warn(`Кнопка с ID ${buttonId} не найдена`);
        return;
    }
    
    if (!modal) {
        console.warn(`Модальное окно с ID ${modalId} не найдено`);
        return;
    }
    
    console.log(`Настройка модального окна: ${modalId} с кнопкой ${buttonId}`);
    
    // Открытие модального окна при клике на кнопку
    openButton.addEventListener('click', () => {
        console.log(`Открытие модального окна: ${modalId}`);
        modal.classList.add('active');
        
        // Вызов callback функции при открытии модального окна, если она указана
        if (openCallback && typeof openCallback === 'function') {
            openCallback();
        }
    });
    
    // Настройка формы, если она указана
    if (formId) {
        setupForm(formId, modal);
    }
    
    // Закрытие модального окна при клике на кнопку закрытия
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log(`Закрытие модального окна: ${modalId}`);
            modal.classList.remove('active');
        });
    });
    
    // Закрытие модального окна при клике на фон
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            console.log(`Закрытие модального окна по клику на фон: ${modalId}`);
            modal.classList.remove('active');
        }
    });
}

/**
 * Настраивает форму внутри модального окна
 * @param {string} formId - ID формы
 * @param {HTMLElement} modal - Элемент модального окна
 */
function setupForm(formId, modal) {
    const form = document.getElementById(formId);
    
    if (!form) {
        console.warn(`Форма с ID ${formId} не найдена`);
        return;
    }
    
    console.log(`Настройка формы: ${formId}`);
    
    // Обработка отправки формы
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log(`Отправка формы: ${formId}`);
        
        // Здесь будет код для отправки данных на сервер
        // ...
        
        // Закрытие модального окна после отправки
        modal.classList.remove('active');
        
        // Очистка формы
        form.reset();
    });
} 