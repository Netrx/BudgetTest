// ===== МОДУЛЬ: ОТЧЕТЫ =====
import { formatDateToRussian } from '../utils/dateHelpers.js';

let storageInstance = null;
let charts = {};
let currentFilters = {
    period: 'month',
    category: 'all',
    dateStart: null,
    dateEnd: null
};

export function init(storage) {
    storageInstance = storage;
    renderReports();
    setupEventListeners();
    populateCategoryFilter();
}

function getFilteredTransactions() {
    let transactions = storageInstance.getTransactions();
    const now = new Date();
    let startDate = null;
    let endDate = null;
    
    switch (currentFilters.period) {
        case 'all':
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(now.getFullYear(), now.getMonth(), diff);
            endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6);
            break;
        case 'custom':
            if (currentFilters.dateStart && currentFilters.dateEnd) {
                startDate = new Date(currentFilters.dateStart);
                endDate = new Date(currentFilters.dateEnd);
            }
            break;
    }
    
    if (startDate && endDate) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        transactions = transactions.filter(t => t.date >= startStr && t.date <= endStr);
    }
    
    // Фильтр по категории
    if (currentFilters.category !== 'all') {
        const category = storageInstance.getCategory(currentFilters.category);
        if (category) {
            // Если выбрана родительская категория, включаем все подкатегории
            const subCategories = storageInstance.getSubCategories(category.id);
            const categoryIds = [category.id, ...subCategories.map(c => c.id)];
            transactions = transactions.filter(t => categoryIds.includes(t.category));
        } else {
            transactions = transactions.filter(t => t.category === currentFilters.category);
        }
    }
    
    return transactions;
}

function populateCategoryFilter() {
    const select = document.getElementById('report-category');
    if (!select) {
        console.log('select report-category not found');
        return;
    }
    
    const categories = storageInstance.getCategories();
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const mainCategories = expenseCategories.filter(c => !c.parentId);
    
    // Сохраняем текущее выбранное значение
    const currentValue = select.value;
    
    select.innerHTML = '<option value="all">Все категории</option>';
    
    mainCategories.forEach(cat => {
        const subCats = expenseCategories.filter(c => c.parentId === cat.id);
        const color = cat.color || '#666666';
        select.innerHTML += `<option value="${cat.id}" style="color: ${color};">${cat.icon} ${cat.name}</option>`;
        subCats.forEach(sub => {
            const subColor = sub.color || '#666666';
            select.innerHTML += `<option value="${sub.id}" style="color: ${subColor}; padding-left: 20px;">&nbsp;&nbsp;↳ ${sub.icon} ${sub.name}</option>`;
        });
    });
    
    // Восстанавливаем выбранное значение
    if (currentValue && [...select.options].some(o => o.value === currentValue)) {
        select.value = currentValue;
    }
}

function renderReports() {
    const transactions = getFilteredTransactions();
    const categories = storageInstance.getCategories();
    
    renderCategoryStats(transactions, categories);
    renderMonthlyChart(transactions);
    renderExpensePieChart(transactions, categories);
}

function renderCategoryStats(transactions, categories) {
    const container = document.getElementById('category-stats');
    if (!container) return;
    
    // Собираем статистику по категориям
    const stats = {};
    let hasData = false;
    
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            hasData = true;
            const catId = t.category;
            if (!stats[catId]) {
                const category = categories.find(c => c.id === catId);
                stats[catId] = {
                    id: catId,
                    name: category ? category.name : t.categoryName || catId,
                    icon: category ? category.icon : '◻',
                    color: category ? category.color : '#666666',
                    parentId: category ? category.parentId : null,
                    total: 0
                };
            }
            stats[catId].total += t.amount;
        });
    
    // Группируем по родительским категориям
    const grouped = {};
    Object.values(stats).forEach(stat => {
        const key = stat.parentId || stat.id;
        if (!grouped[key]) {
            const parentCategory = categories.find(c => c.id === key);
            grouped[key] = {
                id: key,
                name: parentCategory ? parentCategory.name : stat.name,
                icon: parentCategory ? parentCategory.icon : stat.icon,
                color: parentCategory ? parentCategory.color : stat.color,
                total: 0,
                children: []
            };
        }
        if (stat.parentId) {
            grouped[key].children.push(stat);
        } else {
            grouped[key].children.push(stat);
        }
        grouped[key].total += stat.total;
    });
    
    const statsArray = Object.values(grouped)
        .filter(s => s.total > 0)
        .sort((a, b) => b.total - a.total);
    
    if (!hasData || !statsArray.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="icon">◻</span>
                Нет данных о расходах
            </div>
        `;
        return;
    }
    
    const maxTotal = statsArray[0]?.total || 1;
    
    container.innerHTML = statsArray.map((group, index) => {
        const percentage = (group.total / maxTotal * 100);
        const color = group.color || '#666666';
        const hasChildren = group.children.length > 1;
        const realChildren = group.children.filter(c => c.id !== group.id);
        const hasRealChildren = realChildren.length > 0;
        
        let childrenHtml = '';
        if (hasRealChildren) {
            const childMaxTotal = Math.max(...realChildren.map(c => c.total));
            childrenHtml = `
                <div class="subcategory-stats" style="display: none; padding-left: 20px; margin-top: 8px; border-left: 2px solid ${color};">
                    ${realChildren
                        .sort((a, b) => b.total - a.total)
                        .map(child => {
                            const childPercentage = (child.total / childMaxTotal * 100);
                            const childColor = child.color || '#666666';
                            return `
                                <div class="category-stat sub-stat" style="padding: 4px 0; animation: fadeIn 0.2s ease; display: flex; align-items: center; gap: var(--spacing-sm);">
                                    <span class="name" style="color: ${childColor}; font-size: var(--font-size-xs); flex: 1; min-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${child.icon} ${child.name}</span>
                                    <div class="bar-track" style="flex: 1; height: 4px; background: var(--color-bg-secondary); border-radius: var(--radius-sm); overflow: hidden;">
                                        <div class="bar-fill" style="width: ${Math.min(childPercentage, 100)}%; background: ${childColor}; height: 100%; border-radius: var(--radius-sm);"></div>
                                    </div>
                                    <span class="value" style="color: ${childColor}; font-size: var(--font-size-xs); min-width: 80px; text-align: right; flex-shrink: 0;">${child.total.toFixed(2)} ₽</span>
                                </div>
                            `;
                        }).join('')}
                </div>
            `;
        }
        
        const hasToggle = hasRealChildren;
        
        return `
            <div class="category-stat-wrapper" style="margin-bottom: 4px;">
                <div class="category-stat main-stat ${hasToggle ? 'clickable' : ''}" style="animation: fadeIn 0.3s ease ${index * 0.05}s both; padding: 6px 8px; border-radius: var(--radius-sm); cursor: ${hasToggle ? 'pointer' : 'default'}; display: flex; align-items: center; gap: var(--spacing-sm);">
                    <span class="name" style="color: ${color}; ${hasToggle ? 'font-weight: 600;' : ''} flex: 1; min-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${group.icon} ${group.name}</span>
                    <div class="bar-track" style="flex: 1; height: 6px; background: var(--color-bg-secondary); border-radius: var(--radius-sm); overflow: hidden;">
                        <div class="bar-fill" style="width: ${Math.min(percentage, 100)}%; background: ${color}; height: 100%; border-radius: var(--radius-sm); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                    <span class="value" style="color: ${color}; font-weight: ${hasToggle ? '600' : '500'}; min-width: 100px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0;">${group.total.toFixed(2)} ₽</span>
                    ${hasToggle ? `<span class="toggle-icon" style="margin-left: 4px; color: ${color}; font-size: 12px; flex-shrink: 0; transition: transform 0.3s ease; display: inline-block; width: 16px; text-align: center;">▼</span>` : ''}
                </div>
                ${childrenHtml}
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов для раскрытия подкатегорий
    setTimeout(() => {
        document.querySelectorAll('.main-stat.clickable').forEach(el => {
            el.removeEventListener('click', toggleSubcategories);
            el.addEventListener('click', toggleSubcategories);
        });
    }, 50);
}

function toggleSubcategories(e) {
    e.stopPropagation();
    const el = this;
    const wrapper = el.closest('.category-stat-wrapper');
    if (!wrapper) return;
    
    const childrenContainer = wrapper.querySelector('.subcategory-stats');
    const toggleIcon = el.querySelector('.toggle-icon');
    
    if (childrenContainer) {
        if (childrenContainer.style.display === 'none' || childrenContainer.style.display === '') {
            childrenContainer.style.display = 'block';
            if (toggleIcon) {
                toggleIcon.textContent = '▲';
            }
        } else {
            childrenContainer.style.display = 'none';
            if (toggleIcon) {
                toggleIcon.textContent = '▼';
            }
        }
    }
}

function renderMonthlyChart(transactions) {
    const canvas = document.getElementById('monthly-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const months = {};
    transactions.forEach(t => {
        if (!t.date) return;
        const month = t.date.substring(0, 7);
        if (!months[month]) months[month] = { income: 0, expense: 0 };
        if (t.type === 'income') months[month].income += t.amount;
        else months[month].expense += t.amount;
    });
    
    const labels = Object.keys(months).sort();
    const incomeData = labels.map(m => months[m].income);
    const expenseData = labels.map(m => months[m].expense);
    
    if (charts.monthly) {
        charts.monthly.destroy();
        charts.monthly = null;
    }
    
    if (!labels.length) {
        const parent = canvas.parentElement;
        const existing = parent.querySelector('.empty-state');
        if (!existing) {
            const msg = document.createElement('div');
            msg.className = 'empty-state';
            msg.innerHTML = '<span class="icon">◻</span>Нет данных для отображения';
            parent.appendChild(msg);
        }
        canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';
    const parent = canvas.parentElement;
    const existing = parent.querySelector('.empty-state');
    if (existing) existing.remove();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    
    charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => {
                const [year, month] = l.split('-');
                const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                return `${months[parseInt(month) - 1]} ${year}`;
            }),
            datasets: [
                {
                    label: 'Доходы',
                    data: incomeData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: isDark ? '#1A1A1A' : '#FFFFFF',
                    pointBorderWidth: 1
                },
                {
                    label: 'Расходы',
                    data: expenseData,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#EF4444',
                    pointBorderColor: isDark ? '#1A1A1A' : '#FFFFFF',
                    pointBorderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: { size: 11, weight: '500' },
                        boxWidth: 12,
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: value => value + ' ₽',
                        maxTicksLimit: 6
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        font: { size: 9 },
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderExpensePieChart(transactions, categories) {
    const canvas = document.getElementById('expense-pie-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const expenseByCategory = {};
    let hasData = false;
    
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            hasData = true;
            const catId = t.category;
            if (!expenseByCategory[catId]) {
                const category = categories.find(c => c.id === catId);
                expenseByCategory[catId] = {
                    name: category ? category.name : t.categoryName || catId,
                    icon: category ? category.icon : '◻',
                    color: category ? category.color : '#666666',
                    total: 0
                };
            }
            expenseByCategory[catId].total += t.amount;
        });
    
    const items = Object.values(expenseByCategory).filter(item => item.total > 0);
    const labels = items.map(item => `${item.icon} ${item.name}`);
    const data = items.map(item => item.total);
    const colors = items.map(item => item.color || '#666666');
    
    if (charts.pie) {
        charts.pie.destroy();
        charts.pie = null;
    }
    
    if (!hasData || !data.length) {
        const parent = canvas.parentElement;
        const existing = parent.querySelector('.empty-state');
        if (!existing) {
            const msg = document.createElement('div');
            msg.className = 'empty-state';
            msg.innerHTML = '<span class="icon">◻</span>Нет данных о расходах';
            parent.appendChild(msg);
        }
        canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';
    const parent = canvas.parentElement;
    const existing = parent.querySelector('.empty-state');
    if (existing) existing.remove();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: isDark ? '#1A1A1A' : '#FFFFFF',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 14,
                        color: isDark ? '#FFFFFF' : '#000000',
                        font: { size: 11, weight: '400' },
                        boxWidth: 14,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            }
        }
    });
}

function setupEventListeners() {
    const periodSelect = document.getElementById('report-period');
    const dateStart = document.getElementById('report-date-start');
    const dateEnd = document.getElementById('report-date-end');
    const applyBtn = document.getElementById('apply-report-filters');
    const categorySelect = document.getElementById('report-category');
    
    if (!periodSelect || !applyBtn) {
        console.log('Filter elements not found');
        return;
    }
    
    // Показываем/скрываем поля для пользовательского периода
    periodSelect.addEventListener('change', () => {
        const isCustom = periodSelect.value === 'custom';
        const customGroup = document.getElementById('custom-date-group');
        const customGroupEnd = document.getElementById('custom-date-group-end');
        if (customGroup) customGroup.style.display = isCustom ? 'block' : 'none';
        if (customGroupEnd) customGroupEnd.style.display = isCustom ? 'block' : 'none';
        
        // Автоматически заполняем даты при выборе
        if (isCustom) {
            const now = new Date();
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (dateStart && !dateStart.value) dateStart.value = monthAgo.toISOString().split('T')[0];
            if (dateEnd && !dateEnd.value) dateEnd.value = now.toISOString().split('T')[0];
        }
    });
    
    // Применение фильтров
    applyBtn.addEventListener('click', () => {
        currentFilters.period = periodSelect?.value || 'all';
        currentFilters.category = categorySelect?.value || 'all';
        
        if (currentFilters.period === 'custom') {
            currentFilters.dateStart = dateStart?.value || null;
            currentFilters.dateEnd = dateEnd?.value || null;
            
            if (!currentFilters.dateStart || !currentFilters.dateEnd) {
                showToast('Выберите обе даты', 'error');
                return;
            }
            if (currentFilters.dateStart > currentFilters.dateEnd) {
                showToast('Начальная дата не может быть позже конечной', 'error');
                return;
            }
        } else {
            currentFilters.dateStart = null;
            currentFilters.dateEnd = null;
        }
        
        renderReports();
        showToast('Отчеты обновлены', 'success');
    });
    
    // Обновление категорий при добавлении/удалении транзакций
    document.addEventListener('transaction-added', () => {
        populateCategoryFilter();
        renderReports();
    });
    document.addEventListener('transaction-deleted', () => {
        populateCategoryFilter();
        renderReports();
    });
    document.addEventListener('theme-changed', () => {
        renderReports();
    });
}

function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log(message);
    }
}