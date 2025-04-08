import { fetchAPI } from './config.js';
import { showError, showSuccess } from './notifications.js';

function displayDailyReport(report) {
    const resultsDiv = document.getElementById('daily-report-results');
    resultsDiv.innerHTML = `
        <div class="report-content">
            <div class="report-item">
                <span>Total Prints:</span>
                <strong>${report.total_prints}</strong>
            </div>
            <div class="report-item">
                <span>Successful Prints:</span>
                <strong class="success">${report.successful_prints}</strong>
            </div>
            <div class="report-item">
                <span>Failed Prints:</span>
                <strong class="error">${report.failed_prints}</strong>
            </div>
            <div class="report-item">
                <span>Total Print Time:</span>
                <strong>${report.total_print_time.toFixed(1)} hrs</strong>
            </div>
            <div class="report-item">
                <span>Average Print Time:</span>
                <strong>${report.average_print_time.toFixed(1)} hrs</strong>
            </div>
        </div>
    `;
}

function displayPrinterReport(report) {
    const resultsDiv = document.getElementById('printer-report-results');
    resultsDiv.innerHTML = `
        <div class="report-content">
            <div class="report-item">
                <span>Printer Name:</span>
                <strong>${report.printer.name}</strong>
            </div>
            <div class="report-item">
                <span>Total Prints:</span>
                <strong>${report.total_prints}</strong>
            </div>
            <div class="report-item">
                <span>Successful Prints:</span>
                <strong class="success">${report.successful_prints}</strong>
            </div>
            <div class="report-item">
                <span>Failed Prints:</span>
                <strong class="error">${report.failed_prints}</strong>
            </div>
            <div class="report-item">
                <span>Total Downtime:</span>
                <strong class="warning">${report.total_downtime.toFixed(3)} hrs</strong>
            </div>
        </div>
    `;
}

function displayModelReport(report) {
    const resultsDiv = document.getElementById('model-report-results');
    resultsDiv.innerHTML = `
        <div class="report-content">
            <div class="report-item">
                <span>Model Name:</span>
                <strong>${report.model.name}</strong>
            </div>
            <div class="report-item">
                <span>Total Prints:</span>
                <strong>${report.total_prints}</strong>
            </div>
            <div class="report-item">
                <span>Average Print Time:</span>
                <strong>${report.average_print_time.toFixed(1)} hrs</strong>
            </div>
            <div class="report-item">
                <span>Success Rate:</span>
                <strong class="${report.success_rate >= 90 ? 'success' : 'warning'}">
                    ${report.success_rate.toFixed(1)}%
                </strong>
            </div>
        </div>
    `;
}

export async function generateDailyReport() {
    const date = document.getElementById('daily-report-date').value;
    if (!date) {
        showError('Please select a date');
        return;
    }
    
    try {
        const report = await fetchAPI(`/reports/daily/?date=${date}`);
        displayDailyReport(report);
        showSuccess('Daily report generated');
    } catch (error) {
        console.error('Error generating daily report:', error);
        showError('Failed to generate daily report');
    }
}

export async function generatePrinterReport() {
    const printerId = document.getElementById('printer-report-select').value;
    if (!printerId) {
        showError('Please select a printer');
        return;
    }
    
    try {
        const report = await fetchAPI(`/reports/printers/${printerId}`);
        displayPrinterReport(report);
        showSuccess('Printer report generated');
    } catch (error) {
        console.error('Error generating printer report:', error);
        showError('Failed to generate printer report');
    }
}

export async function generateModelReport() {
    const modelId = document.getElementById('model-report-select').value;
    if (!modelId) {
        showError('Please select a model');
        return;
    }
    
    try {
        const report = await fetchAPI(`/reports/models/${modelId}`);
        displayModelReport(report);
        showSuccess('Model report generated');
    } catch (error) {
        console.error('Error generating model report:', error);
        showError('Failed to generate model report');
    }
}

// Функция для заполнения выпадающих списков принтеров и моделей
export async function populateReportSelects() {
    try {
        const [printers, models] = await Promise.all([
            fetchAPI('/printers/'),
            fetchAPI('/models/')
        ]);
        
        const printerSelect = document.getElementById('printer-report-select');
        const modelSelect = document.getElementById('model-report-select');
        
        if (printerSelect) {
            printerSelect.innerHTML = `
                <option value="">Select Printer</option>
                ${printers.map(printer => `
                    <option value="${printer.id}">${printer.name}</option>
                `).join('')}
            `;
        }
        
        if (modelSelect) {
            modelSelect.innerHTML = `
                <option value="">Select Model</option>
                ${models.map(model => `
                    <option value="${model.id}">${model.name}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error populating report selects:', error);
        showError('Failed to load printers and models');
    }
}

export async function generateAllPrintersReport() {
    try {
        console.log('Fetching printers data...');
        const printers = await fetchAPI('/printers/');
        console.log('Received printers data:', printers);

        // Ищем таблицу внутри модального окна
        const modal = document.getElementById('general-report-modal');
        const tableBody = modal.querySelector('#all-printers-report-table tbody');
        
        if (!tableBody) {
            console.error('All Printers Report table not found in modal');
            return;
        }

        tableBody.innerHTML = printers.map(printer => `
            <tr>
                <td>${printer.id}</td>
                <td>${printer.name}</td>
                <td>${printer.status}</td>
                <td>${printer.total_print_time?.toFixed(2) || '0.00'}</td>
                <td>${printer.total_downtime?.toFixed(2) || '0.00'}</td>
            </tr>
        `).join('');

        showSuccess('All Printers Report generated successfully');
    } catch (error) {
        console.error('Error generating All Printers Report:', error);
        showError('Failed to generate All Printers Report');
    }
}

export async function downloadAllPrintersReport() {
    try {
        const response = await fetch('/reports/printers/export/');
        if (!response.ok) {
            throw new Error('Failed to download report');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'printers_report.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showSuccess('Report downloaded successfully');
    } catch (error) {
        console.error('Error downloading report:', error);
        showError('Failed to download report');
    }
}

export function setupGeneralReportModal() {
    const modal = document.getElementById('general-report-modal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    // Находим кнопки внутри модального окна
    const generateReportButton = modal.querySelector('#generate-all-printers-report');
    const downloadReportButton = modal.querySelector('#download-all-printers-report');
    const closeModalButton = modal.querySelector('.close-modal');
    const openModalButton = document.getElementById('open-general-report-modal');

    if (!generateReportButton || !downloadReportButton) {
        console.error('Report buttons not found in modal');
        return;
    }

    // Открытие модального окна и генерация отчета
    openModalButton?.addEventListener('click', () => {
        modal.classList.add('active');
        generateAllPrintersReport();
    });

    // Закрытие модального окна
    closeModalButton?.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Закрытие по клику вне окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Добавляем обработчики событий непосредственно на кнопки
    generateReportButton.onclick = async (e) => {
        e.preventDefault();
        console.log('Generate report button clicked');
        await generateAllPrintersReport();
    };

    downloadReportButton.onclick = async (e) => {
        e.preventDefault();
        console.log('Download report button clicked');
        await downloadAllPrintersReport();
    };
}
