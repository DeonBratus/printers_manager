export function createPrinterStatusChart(printers) {
    const ctx = document.getElementById('printer-status-chart').getContext('2d');
    const statusCounts = printers.reduce((acc, printer) => {
        acc[printer.status] = (acc[printer.status] || 0) + 1;
        return acc;
    }, { idle: 0, printing: 0, paused: 0, error: 0 });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Idle', 'Printing', 'Paused', 'Error'],
            datasets: [{
                data: [statusCounts.idle, statusCounts.printing, 
                       statusCounts.paused, statusCounts.error],
                backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            cutout: '70%'
        }
    });
}

export function createPrintTimeChart(printings) {
    const ctx = document.getElementById('print-time-chart').getContext('2d');
    const timeRanges = calculateTimeRanges(printings);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(timeRanges),
            datasets: [{
                label: 'Print Jobs',
                data: Object.values(timeRanges),
                backgroundColor: '#4361ee'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Print Jobs' }
                }
            }
        }
    });
}

function calculateTimeRanges(printings) {
    const completedPrintings = printings.filter(p => p.real_time_stop);
    const timeRanges = { '0-2h': 0, '2-4h': 0, '4-6h': 0, '6-8h': 0, '8h+': 0 };
    
    completedPrintings.forEach(printing => {
        const duration = (new Date(printing.real_time_stop) - new Date(printing.start_time)) / (1000 * 60 * 60);
        if (duration <= 2) timeRanges['0-2h']++;
        else if (duration <= 4) timeRanges['2-4h']++;
        else if (duration <= 6) timeRanges['4-6h']++;
        else if (duration <= 8) timeRanges['6-8h']++;
        else timeRanges['8h+']++;
    });
    
    return timeRanges;
}
