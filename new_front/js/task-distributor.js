class TaskDistributor {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const distributeBtn = document.getElementById('distribute-tasks-btn');
        if (distributeBtn) {
            distributeBtn.addEventListener('click', () => this.distributeTasks());
        }
    }

    async distributeTasks() {
        const material = document.getElementById('material-type').value;
        const accuracy = document.getElementById('accuracy').value;
        const quantity = document.getElementById('quantity').value;

        const taskDetails = {
            material: material,
            accuracy: parseFloat(accuracy),
            quantity: parseInt(quantity)
        };

        try {
            const response = await fetch('/tasks/distribute/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskDetails)
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                this.displayResults(data.tasks);
            } else {
                throw new Error(data.detail || 'Failed to distribute tasks');
            }
        } catch (error) {
            console.error('Error:', error);
            // Show error notification
            alert(`Error: ${error.message}`);
        }
    }

    displayResults(tasks) {
        const resultsGrid = document.getElementById('distribution-results-grid');
        resultsGrid.innerHTML = ''; // Clear previous results

        tasks.forEach(task => {
            const resultCard = this.createResultCard(task);
            resultsGrid.appendChild(resultCard);
        });
    }

    createResultCard(task) {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        card.innerHTML = `
            <h4>Printer: ${task.printer_name}</h4>
            <div class="result-info">
                <div class="result-info-item">
                    <span>Parts Assigned:</span>
                    <strong>${task.parts_assigned}</strong>
                </div>
                <div class="result-info-item">
                    <span>Status:</span>
                    <strong class="status-badge status-queued">Queued</strong>
                </div>
            </div>
        `;

        return card;
    }
}

// Initialize task distributor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TaskDistributor();
});
