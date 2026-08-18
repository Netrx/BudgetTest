// ===== МОДУЛЬ: ОТЧЕТЫ =====
import { formatDateToRussian } from '../utils/dateHelpers.js';
import { showToast } from '../components/toast.js';

let storageInstance = null;
let charts = {};
let selectedCategories = ['all'];
let selectedSubcategories = [];
let pieFilters = {
    period: 'month',
    dateStart: null,
    dateEnd: null
};

// Данные о подкатегориях для каждой родительской категории
const subcategoryData = {
    food: ['food_home', 'food_cafe', 'food_delivery'],
    transport: ['transport_bus', 'transport_taxi', 'transport_fuel', 'transport_maintenance'],
    entertainment: ['entertainment_movies', 'entertainment_games', 'entertainment_hobbies'],
    shopping: ['shopping_clothes', 'shopping_electronics', 'shopping_home'],
    bills: ['bills_utilities', 'bills_internet', 'bills_phone'],
    health: ['health_pharmacy', 'health_doctors']
};

// Названия и иконки для подкатегорий
const subcategoryNames = {
    food_home: { icon: '◻', name: 'Домашняя еда', color: '#F59E0B' },
    food_cafe: { icon: '★', name: 'Кафе и рестораны', color: '#F43F5E' },
    food_delivery: { icon: '⊞', name: 'Доставка', color: '#F97316' },
    transport_bus: { icon: '◆', name: 'Общественный', color: '#F59E0B' },
    transport_taxi: { icon: '◇', name: 'Такси', color: '#EAB308' },
    transport_fuel: { icon: '●', name: 'Топливо', color: '#F97316' },
    transport_maintenance: { icon: '▣', name: 'Обслуживание', color: '#EF4444' },
    entertainment_movies: { icon: '☆', name: 'Кино', color: '#EC4899' },
    entertainment_games: { icon: '✦', name: 'Игры', color: '#D946EF' },
    entertainment_hobbies: { icon: '◻', name: 'Хобби', color: '#A855F7' },
    shopping_clothes: { icon: '●', name: 'Одежда', color: '#F97316' },
    shopping_electronics: { icon: '▣', name: 'Электроника', color: '#F59E0B' },
    shopping_home: { icon: '▦', name: 'Для дома', color: '#EAB308' },
    bills_utilities: { icon: '▦', name: 'Коммунальные', color: '#06B6D4' },
    bills_internet: { icon: '⊞', name: 'Интернет', color: '#3B82F6' },
    bills_phone: { icon: '◆', name: 'Телефон', color: '#6366F1' },
    health_pharmacy: { icon: '▲', name: 'Аптека', color: '#22C55E' },
    health_doctors: { icon: '△', name: 'Врачи', color: '#10B981' }
};

export function init(storage) {
    storageInstance = storage;
    renderReports();
    setupEventListeners();
    setupCategoryButtons();
    setupClearFiltersButton();
    
    // Инициализация дат при загрузке
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const dateStart = document.getElementById('report-pie-date-start');
    const dateEnd = document.getElementById('report-pie-date-end');
    if (dateStart && !dateStart.value) {
        dateStart.value = monthAgo.toISOString().split('T')[0];
    }
    if (dateEnd && !dateEnd.value) {
        dateEnd.value = now.toISOString().split('T')[0];
    }
    pieFilters.dateStart = dateStart?.value || null;
    pieFilters.dateEnd = dateEnd?.value || null;
}

function setupClearFiltersButton() {
    const clearBtn = document.getElementById('clear-filters-btn');
    if (!clearBtn) return;
    
    clearBtn.addEventListener('click', function() {
        // Сбрасываем выбранные категории
        selectedCategories = ['all'];
        selectedSubcategories = [];
        
        // Сбрасываем активные состояния кнопок категорий
        document.querySelectorAll('.category-filter-btn.main-cat').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.border = '1px solid var(--color-border)';
            b.style.color = b.dataset.color || '#666666';
        });
        
        // Активируем кнопку "Все"
        const allBtn = document.querySelector('.category-filter-btn[data-category="all"]');
        if (allBtn) {
            allBtn.classList.add('active');
            allBtn.style.background = 'var(--color-text)';
            allBtn.style.color = 'var(--color-bg)';
            allBtn.style.border = '1px solid var(--color-text)';
        }
        
        // Очищаем подкатегории
        document.getElementById('subcategories-container').innerHTML = '';
        
        // Сбрасываем период на "Месяц"
        document.querySelectorAll('.period-btn-pie').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--color-text-secondary)';
        });
        const monthBtn = document.querySelector('.period-btn-pie[data-period="month"]');
        if (monthBtn) {
            monthBtn.classList.add('active');
            monthBtn.style.background = 'var(--color-text)';
            monthBtn.style.color = 'var(--color-bg)';
        }
        pieFilters.period = 'month';
        pieFilters.dateStart = null;
        pieFilters.dateEnd = null;
        
        // Скрываем кастомные даты
        document.getElementById('pie-custom-dates').style.display = 'none';
        
        // Обновляем графики
        renderReports();
        showToast('Фильтры очищены', 'success');
    });
}

function setupCategoryButtons() {
    // Обработчики для основных категорий
    document.querySelectorAll('.category-filter-btn.main-cat').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Если выбрана категория
            if (category !== 'all') {
                // Убираем "Все" если оно было выбрано
                const allBtn = document.querySelector('.category-filter-btn[data-category="all"]');
                if (selectedCategories.includes('all')) {
                    selectedCategories = selectedCategories.filter(c => c !== 'all');
                    allBtn.classList.remove('active');
                    allBtn.style.background = 'transparent';
                    allBtn.style.color = 'var(--color-text-secondary)';
                    allBtn.style.border = '1px solid var(--color-border)';
                }
                
                // Переключаем категорию
                const index = selectedCategories.indexOf(category);
                if (index === -1) {
                    selectedCategories.push(category);
                    this.classList.add('active');
                    this.style.background = 'var(--color-text)';
                    this.style.color = 'var(--color-bg)';
                    this.style.border = '1px solid var(--color-text)';
                } else {
                    selectedCategories.splice(index, 1);
                    this.classList.remove('active');
                    this.style.background = 'transparent';
                    this.style.color = this.dataset.color || '#666666';
                    this.style.border = '1px solid var(--color-border)';
                }
                
                // Если не осталось выбранных категорий - выбираем "Все"
                if (selectedCategories.length === 0) {
                    selectedCategories = ['all'];
                    const allBtn2 = document.querySelector('.category-filter-btn[data-category="all"]');
                    if (allBtn2) {
                        allBtn2.classList.add('active');
                        allBtn2.style.background = 'var(--color-text)';
                        allBtn2.style.color = 'var(--color-bg)';
                        allBtn2.style.border = '1px solid var(--color-text)';
                    }
                }
            } else {
                // Выбрано "Все"
                selectedCategories = ['all'];
                selectedSubcategories = [];
                document.querySelectorAll('.category-filter-btn.main-cat').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.border = '1px solid var(--color-border)';
                    b.style.color = b.dataset.color || '#666666';
                });
                this.classList.add('active');
                this.style.background = 'var(--color-text)';
                this.style.color = 'var(--color-bg)';
                this.style.border = '1px solid var(--color-text)';
                
                // Очищаем подкатегории
                document.getElementById('subcategories-container').innerHTML = '';
                selectedSubcategories = [];
            }
            
            // Обновляем отображение подкатегорий
            renderSubcategories();
            
            // Обновляем графики
            renderReports();
        });
    });
    
    // Обработчики для подкатегорий (добавляются динамически)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('category-filter-btn') && e.target.classList.contains('sub-cat')) {
            const btn = e.target;
            const subcategory = btn.dataset.category;
            
            // Переключаем подкатегорию
            const index = selectedSubcategories.indexOf(subcategory);
            if (index === -1) {
                selectedSubcategories.push(subcategory);
                btn.classList.add('active');
                btn.style.background = 'var(--color-text)';
                btn.style.color = 'var(--color-bg)';
                btn.style.border = '1px solid var(--color-text)';
            } else {
                selectedSubcategories.splice(index, 1);
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.border = '1px solid var(--color-border)';
                btn.style.color = btn.dataset.color || '#666666';
            }
            
            renderReports();
        }
    });
    
    // Кнопка "Все"
    document.querySelector('.category-filter-btn[data-category="all"]')?.addEventListener('click', function() {
        // Обработка уже есть выше
    });
}

function renderSubcategories() {
    const container = document.getElementById('subcategories-container');
    if (!container) return;
    
    // Показываем подкатегории только для выбранных основных категорий
    const activeMainCategories = selectedCategories.filter(c => c !== 'all');
    
    if (activeMainCategories.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    activeMainCategories.forEach(catId => {
        const subIds = subcategoryData[catId] || [];
        if (subIds.length === 0) return;
        
        const mainCat = document.querySelector(`.main-cat[data-category="${catId}"]`);
        const catName = mainCat ? mainCat.textContent : catId;
        const catColor = mainCat ? mainCat.dataset.color || '#666666' : '#666666';
        
        html += `
            <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-items: center; padding: 6px 10px; background: var(--color-bg-secondary); border-radius: var(--radius-sm); border: 1px dashed ${catColor}; width: 100%; box-sizing: border-box;">
                <span style="font-size: var(--font-size-xs); color: ${catColor}; font-weight: 600; padding: 2px 8px; width: 100%; text-align: center;">${catName}</span>
                ${subIds.map(id => {
                    const info = subcategoryNames[id] || { icon: '◻', name: id, color: '#666666' };
                    const isActive = selectedSubcategories.includes(id);
                    return `
                        <button class="category-filter-btn sub-cat ${isActive ? 'active' : ''}" 
                                data-category="${id}" 
                                data-color="${info.color}"
                                style="padding: 4px 10px; border: 1px solid ${isActive ? 'var(--color-text)' : 'var(--color-border)'}; 
                                       background: ${isActive ? 'var(--color-text)' : 'transparent'}; 
                                       color: ${isActive ? 'var(--color-bg)' : info.color}; 
                                       border-radius: var(--radius-sm); font-family: var(--font-family); 
                                       font-size: var(--font-size-xs); font-weight: 500; cursor: pointer; 
                                       transition: var(--transition); white-space: nowrap;">
                            ${info.icon} ${info.name}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getFilteredPieTransactions() {
    let transactions = storageInstance.getTransactions();
    const now = new Date();
    let startDate = null;
    let endDate = null;
    
    switch (pieFilters.period) {
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
            if (pieFilters.dateStart && pieFilters.dateEnd) {
                startDate = new Date(pieFilters.dateStart);
                endDate = new Date(pieFilters.dateEnd);
            }
            break;
    }
    
    if (startDate && endDate) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        transactions = transactions.filter(t => t.date >= startStr && t.date <= endStr);
    }
    
    return transactions;
}

function getAllTransactions() {
    return storageInstance.getTransactions();
}

function renderReports() {
    const allTransactions = getAllTransactions();
    const categories = storageInstance.getCategories();
    
    renderCategoryStats(allTransactions, categories);
    renderMonthlyChart(allTransactions);
    renderExpensePieCharts(allTransactions, categories);
}

function renderCategoryStats(transactions, categories) {
    const container = document.getElementById('category-stats');
    if (!container) return;
    
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

function renderExpensePieCharts(transactions, categories) {
    // Получаем все расходы
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // 1. ГРАФИК ПО КАТЕГОРИЯМ (СЛЕВА)
    // Если выбрано "Все" или ничего не выбрано - показываем все категории
    // Если выбраны конкретные категории - показываем только их
    let categoryFilter = null;
    if (!selectedCategories.includes('all') && selectedCategories.length > 0) {
        categoryFilter = selectedCategories;
    }
    // Если selectedCategories содержит 'all' или пусто - categoryFilter остается null (показываем все)
    
    renderPieChart(
        'expense-pie-chart',
        expenseTransactions,
        categories,
        categoryFilter,
        'category'
    );
    
    // 2. ГРАФИК ПО ПОДКАТЕГОРИЯМ (СПРАВА)
    // Показываем только выбранные подкатегории
    let subcategoryFilter = null;
    if (selectedSubcategories.length > 0) {
        subcategoryFilter = selectedSubcategories;
    }
    // Если подкатегории не выбраны - показываем все подкатегории выбранных категорий или все
    
    renderPieChart(
        'subcategory-pie-chart',
        expenseTransactions,
        categories,
        subcategoryFilter,
        'subcategory'
    );
}

function renderPieChart(canvasId, transactions, categories, filter, type) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Удаляем старый график
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        charts[canvasId] = null;
    }
    
    // Группируем данные
    const dataByCategory = {};
    let hasData = false;
    
    transactions.forEach(t => {
        const catId = t.category;
        const category = categories.find(c => c.id === catId);
        
        // Для графика по категориям - показываем только основные категории (без parentId)
        if (type === 'category') {
            if (!category || category.parentId) return;
            
            // Применяем фильтр для категорий (если он есть)
            if (filter !== null && filter !== undefined && filter.length > 0) {
                if (!filter.includes(catId)) return;
            }
            // Если filter === null или пустой массив - показываем все категории
        }
        
        // Для графика по подкатегориям
        if (type === 'subcategory') {
            if (!category || !category.parentId) return;
            
            // Применяем фильтр для подкатегорий (если он есть)
            if (filter !== null && filter !== undefined && filter.length > 0) {
                if (!filter.includes(catId)) return;
            }
            // Если filter === null или пустой массив - показываем все подкатегории
        }
        
        hasData = true;
        if (!dataByCategory[catId]) {
            dataByCategory[catId] = {
                name: category ? category.name : t.categoryName || catId,
                icon: category ? category.icon : '◻',
                color: category ? category.color : '#666666',
                total: 0
            };
        }
        dataByCategory[catId].total += t.amount;
    });
    
    const items = Object.values(dataByCategory).filter(item => item.total > 0);
    const labels = items.map(item => `${item.icon} ${item.name}`);
    const data = items.map(item => item.total);
    const colors = items.map(item => item.color || '#666666');
    
    // Удаляем сообщение "Нет данных" если оно есть
    const parent = canvas.parentElement;
    const existingMsg = parent.querySelector('.empty-state');
    if (existingMsg) existingMsg.remove();
    
    if (!hasData || !data.length) {
        const msg = document.createElement('div');
        msg.className = 'empty-state';
        msg.innerHTML = '<span class="icon">◻</span>Нет данных';
        parent.appendChild(msg);
        canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    charts[canvasId] = new Chart(ctx, {
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
                        font: { size: 10, weight: '400' },
                        boxWidth: 12,
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
    const pieCustomDates = document.getElementById('pie-custom-dates');
    const dateStart = document.getElementById('report-pie-date-start');
    const dateEnd = document.getElementById('report-pie-date-end');
    const applyDatesBtn = document.getElementById('apply-pie-dates');
    
    // Обработчики для кнопок периода
    document.querySelectorAll('.period-btn-pie').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn-pie').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--color-text-secondary)';
            });
            
            this.classList.add('active');
            this.style.background = 'var(--color-text)';
            this.style.color = 'var(--color-bg)';
            
            const period = this.dataset.period;
            
            if (period === 'custom') {
                pieCustomDates.style.display = 'flex';
                const now = new Date();
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                if (!dateStart.value) dateStart.value = monthAgo.toISOString().split('T')[0];
                if (!dateEnd.value) dateEnd.value = now.toISOString().split('T')[0];
                pieFilters.period = 'custom';
                pieFilters.dateStart = dateStart.value;
                pieFilters.dateEnd = dateEnd.value;
            } else {
                pieCustomDates.style.display = 'none';
                pieFilters.period = period;
                pieFilters.dateStart = null;
                pieFilters.dateEnd = null;
            }
            
            renderReports();
            showToast(`Период: ${this.textContent}`, 'success');
        });
    });
    
    // Применить даты
    applyDatesBtn?.addEventListener('click', () => {
        if (!dateStart.value || !dateEnd.value) {
            showToast('Выберите обе даты', 'error');
            return;
        }
        if (dateStart.value > dateEnd.value) {
            showToast('Начальная дата не может быть позже конечной', 'error');
            return;
        }
        pieFilters.dateStart = dateStart.value;
        pieFilters.dateEnd = dateEnd.value;
        pieFilters.period = 'custom';
        
        renderReports();
        showToast(`Период: ${dateStart.value} — ${dateEnd.value}`, 'success');
    });
    
    document.addEventListener('transaction-added', () => {
        renderReports();
    });
    document.addEventListener('transaction-deleted', () => {
        renderReports();
    });
    document.addEventListener('theme-changed', () => {
        renderReports();
    });
}