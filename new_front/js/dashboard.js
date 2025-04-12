import { fetchAPI } from './config.js';
import { showError } from './notifications.js';

export async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...'); // Отладочный лог
        const [printers, models, printings] = await Promise.all([
            fetchAPI('/printers/'),
            fetchAPI('/models/'),
            fetchAPI('/printings/')
        ]);

        console.log('Received data:', { printers, models, printings }); // Отладочный лог

        // Обновляем статистику
        document.getElementById('total-printers').textContent = printers.length || '0';
        document.getElementById('total-models').textContent = models.length || '0';
        
        const activePrintingsCount = printings.filter(p => !p.real_time_stop).length;
        document.getElementById('active-printings').textContent = activePrintingsCount || '0';

        const today = new Date().toISOString().split('T')[0];
        const completedToday = printings.filter(p => 
            p.real_time_stop && 
            new Date(p.real_time_stop).toISOString().split('T')[0] === today
        ).length;
        document.getElementById('completed-printings').textContent = completedToday || '0';

        // Создаем графики
        createPrinterStatusChart(printers);
        createPrintTimeChart(printings);

        // Обновляем список текущих печатей (печатающих или ожидающих)
        const currentPrintings = printings
            .filter(p => !p.real_time_stop)
            .sort((a, b) => new Date(b.real_time_start || b.created_at) - new Date(a.real_time_start || a.created_at));

        const activePrintingsList = document.getElementById('active-printings-list');
        if (activePrintingsList) {
            if (currentPrintings.length > 0) {
                activePrintingsList.innerHTML = currentPrintings.map(printing => {
                    const isPrinting = printing.real_time_start && !printing.real_time_stop;
                    const status = isPrinting ? 'printing' : 'waiting';
                    const statusText = isPrinting ? 'Печатается' : 'Ожидает';
                    
                    return `
                        <div class="activity-item">
                            <div class="activity-icon status-${status}">
                                <i class="fas ${isPrinting ? 'fa-spinner fa-spin' : 'fa-hourglass'}"></i>
                            </div>
                            <div class="activity-info">
                                <h4>${printing.model_name || 'Unknown model'}</h4>
                                <p>${statusText} на ${printing.printer_name || 'Unknown printer'}</p>
                            </div>
                            <span class="activity-time status-badge status-${status}">
                                ${statusText}
                            </span>
                        </div>
                    `;
                }).join('');
            } else {
                activePrintingsList.innerHTML = '<div class="empty-state">Нет активных печатей</div>';
            }
        }

        // Обновляем список последних печатей
        const recentPrintings = printings
            .filter(p => p.real_time_stop)
            .sort((a, b) => new Date(b.real_time_stop) - new Date(a.real_time_stop))
            .slice(0, 5);

        const recentPrintingsList = document.getElementById('recent-printings');
        if (recentPrintingsList) {
            if (recentPrintings.length > 0) {
                recentPrintingsList.innerHTML = recentPrintings.map(printing => {
                    const stopDate = new Date(printing.real_time_stop);
                    const formattedDate = stopDate.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    return `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="fas fa-print"></i>
                            </div>
                            <div class="activity-info">
                                <h4>${printing.model_name || 'Неизвестная модель'}</h4>
                                <p>Напечатано на ${printing.printer_name || 'Неизвестный принтер'}</p>
                            </div>
                            <span class="activity-time">
                                ${formattedDate}
                            </span>
                        </div>
                    `;
                }).join('');
            } else {
                recentPrintingsList.innerHTML = '<div class="empty-state">История печати пуста</div>';
            }
        }

    } catch (error) {
        console.error('Dashboard data loading error:', error); // Отладочный лог
        showError('Failed to load dashboard data');
    }
}

function createPrinterStatusChart(printers) {
    const ctx = document.getElementById('printer-status-chart')?.getContext('2d');
    if (!ctx) return;

    // Очищаем предыдущий график, если он существует
    if (window.printerStatusChart) {
        window.printerStatusChart.destroy();
    }

    const statusCounts = printers.reduce((acc, printer) => {
        acc[printer.status || 'idle'] = (acc[printer.status || 'idle'] || 0) + 1;
        return acc;
    }, { idle: 0, printing: 0, waiting: 0, paused: 0, error: 0 });

    window.printerStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Простаивает', 'Печатает', 'Ожидает', 'Приостановлен', 'Ошибка'],
            datasets: [{
                data: [
                    statusCounts.idle || 0,
                    statusCounts.printing || 0,
                    statusCounts.waiting || 0,
                    statusCounts.paused || 0,
                    statusCounts.error || 0
                ],
                backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9e9e9e', '#f44336']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            cutout: '70%'
        }
    });
}

function createPrintTimeChart(printings) {
    const ctx = document.getElementById('print-time-chart')?.getContext('2d');
    if (!ctx) return;

    // Очищаем предыдущий график, если он существует
    if (window.printTimeChart) {
        window.printTimeChart.destroy();
    }

    const completedPrintings = printings.filter(p => p.real_time_stop);
    const timeRanges = { '0-2ч': 0, '2-4ч': 0, '4-6ч': 0, '6-8ч': 0, '8ч+': 0 };

    completedPrintings.forEach(printing => {
        const duration = printing.printing_time || 0;
        if (duration <= 2) timeRanges['0-2ч']++;
        else if (duration <= 4) timeRanges['2-4ч']++;
        else if (duration <= 6) timeRanges['4-6ч']++;
        else if (duration <= 8) timeRanges['6-8ч']++;
        else timeRanges['8ч+']++;
    });

    window.printTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(timeRanges),
            datasets: [{
                label: 'Задания печати',
                data: Object.values(timeRanges),
                backgroundColor: '#4361ee'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}
