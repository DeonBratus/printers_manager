class QueueManager {
    constructor() {
        this.initializeEventListeners();
        this.updateQueues();
        this.updateInterval = setInterval(() => this.updateQueues(), 30000); // Обновление каждые 30 секунд
    }

    initializeEventListeners() {
        document.getElementById('add-to-queue-btn')?.addEventListener('click', () => this.showAddToQueueModal());
        document.getElementById('queue-form')?.addEventListener('submit', (e) => this.handleQueueSubmit(e));
    }

    async showAddToQueueModal() {
        const modal = document.getElementById('add-to-queue-modal');
        const printerSelect = document.getElementById('queue-printer');
        const modelSelect = document.getElementById('queue-model');

        try {
            const [printers, models] = await Promise.all([
                this.fetchPrinters(),
                this.fetchModels()
            ]);

            printerSelect.innerHTML = '<option value="">Select Printer</option>' +
                printers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            
            modelSelect.innerHTML = '<option value="">Select Model</option>' +
                models.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

            modal.classList.add('active');
        } catch (error) {
            console.error('Error loading data:', error);
            showNotification('Failed to load printers or models', 'error');
        }
    }

    async handleQueueSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const queueItem = {
            printer_id: parseInt(formData.get('printer_id')),
            model_id: parseInt(formData.get('model_id')),
            quantity: parseInt(formData.get('quantity')),
            priority: parseInt(formData.get('priority'))
        };

        try {
            const response = await fetch('/queue/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queueItem)
            });

            if (!response.ok) throw new Error('Failed to add to queue');

            document.getElementById('add-to-queue-modal').classList.remove('active');
            this.updateQueues();
            showNotification('Successfully added to queue', 'success');
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message, 'error');
        }
    }

    async updateQueues() {
        const queuesGrid = document.getElementById('printer-queues');
        if (!queuesGrid) return;

        try {
            const printers = await this.fetchPrinters();
            let queuesHTML = '';

            for (const printer of printers) {
                const queueItems = await this.fetchPrinterQueue(printer.id);
                queuesHTML += this.createPrinterQueueHTML(printer, queueItems);
            }

            queuesGrid.innerHTML = queuesHTML;
            this.initializeQueueActions();
        } catch (error) {
            console.error('Error updating queues:', error);
        }
    }

    createPrinterQueueHTML(printer, queueItems) {
        const priorityLabels = {
            0: 'Normal',
            1: 'High',
            2: 'Urgent'
        };

        return `
            <div class="printer-queue">
                <div class="printer-queue-header">
                    <h3>${printer.name}</h3>
                    <span class="queue-count">${queueItems.length} items</span>
                </div>
                <div class="queue-items">
                    ${queueItems.map(item => `
                        <div class="queue-item">
                            <span class="queue-item-model">${item.model_name}</span>
                            <span class="queue-item-quantity">Quantity: ${item.quantity}</span>
                            <span class="queue-item-priority">Priority: ${priorityLabels[item.priority]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `}};
