export class TableManager {
    constructor(tableId, options = {}) {
        this.tableId = tableId;
        this.table = document.getElementById(tableId);
        this.searchInput = document.querySelector(`#${tableId}-search`);
        this.statusFilter = document.querySelector(`#${tableId}-status-filter`);
        this.itemsPerPage = options.itemsPerPage || 10;
        this.currentPage = 1;
        this.filteredData = [];
        this.originalData = [];
        this.sortColumn = null;
        this.sortDesc = false;
        
        this.initializeListeners();
        this.initializeSortHeaders();
    }

    initializeListeners() {
        // Поиск
        this.searchInput?.addEventListener('input', () => {
            this.currentPage = 1;
            this.applyFilters();
        });

        // Фильтр статуса
        this.statusFilter?.addEventListener('change', () => {
            this.currentPage = 1;
            this.applyFilters();
        });

        // Кнопки пагинации
        document.querySelector(`#${this.tableId}-prev-page`)?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });

        document.querySelector(`#${this.tableId}-next-page`)?.addEventListener('click', () => {
            if (this.currentPage < this.getTotalPages()) {
                this.currentPage++;
                this.renderTable();
            }
        });
    }

    initializeSortHeaders() {
        if (!this.table) return;
        
        const headers = this.table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => this.handleSort(header.dataset.sort));
            // Добавляем иконку сортировки
            header.innerHTML += ' <span class="sort-icon"></span>';
        });
    }

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDesc = !this.sortDesc;
        } else {
            this.sortColumn = column;
            this.sortDesc = false;
        }

        this.updateSortIcons();
        this.loadData();
    }

    updateSortIcons() {
        if (!this.table) return;

        const headers = this.table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (header.dataset.sort === this.sortColumn) {
                icon.textContent = this.sortDesc ? '▼' : '▲';
            } else {
                icon.textContent = '';
            }
        });
    }

    async loadData() {
        const baseUrl = this.getBaseUrl();
        const params = new URLSearchParams({
            skip: (this.currentPage - 1) * this.itemsPerPage,
            limit: this.itemsPerPage
        });

        if (this.sortColumn) {
            params.append('sort_by', this.sortColumn);
            params.append('sort_desc', this.sortDesc);
        }

        try {
            const response = await fetch(`${baseUrl}?${params}`);
            if (!response.ok) throw new Error('Failed to load data');
            const data = await response.json();
            this.setData(data);
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load data');
        }
    }

    getBaseUrl() {
        switch(this.tableId) {
            case 'printers-table': return '/printers/';
            case 'models-table': return '/models/';
            case 'printings-table': return '/printings/';
            default: return '/';
        }
    }

    setData(data) {
        this.originalData = data;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.originalData];

        // Применяем поиск
        if (this.searchInput?.value) {
            const searchTerm = this.searchInput.value.toLowerCase();
            filtered = filtered.filter(item => 
                Object.values(item)
                    .some(val => String(val).toLowerCase().includes(searchTerm))
            );
        }

        // Применяем фильтр статуса
        if (this.statusFilter?.value && this.statusFilter.value !== 'all') {
            filtered = filtered.filter(item => 
                item.status?.toLowerCase() === this.statusFilter.value.toLowerCase()
            );
        }

        this.filteredData = filtered;
        this.renderTable();
        this.updatePagination();
    }

    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.itemsPerPage);
    }

    getCurrentPageData() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredData.slice(start, end);
    }

    updatePagination() {
        const totalPages = this.getTotalPages();
        const paginationInfo = document.querySelector(`#${this.tableId}-pagination-info`);
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }

        // Обновляем состояние кнопок
        const prevButton = document.querySelector(`#${this.tableId}-prev-page`);
        const nextButton = document.querySelector(`#${this.tableId}-next-page`);
        
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
        }
        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
        }
    }

    renderTable() {
        if (!this.table) return;

        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;

        const pageData = this.getCurrentPageData();
        tbody.innerHTML = this.formatTableRows(pageData);
        this.updatePagination();
    }

    formatTableRows(data) {
        // Этот метод должен быть переопределен в дочерних классах
        return '';
    }
}