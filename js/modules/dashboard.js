// ===== МОДУЛЬ: ДАШБОРД =====
import { DEFAULT_CATEGORIES } from '../config/constants.js';
import { formatDateToRussian } from '../utils/dateHelpers.js';

let storageInstance = null;
let chartInstance = null;
let currentPeriod = 'all';
let customStartDate = null;
let customEndDate = null;

export function init(storage) {
    storageInstance = storage;
    renderDashboard();
    setupEventListeners();
}

function getFilteredTransactions() {
    const allTransactions = storageInstance.getTransactions();
    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (currentPeriod) {
        case 'all':
            return allTransactions;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'custom':
            if (customStartDate && customEndDate) {
                startDate = new Date(customStartDate);
                endDate = new Date(customEndDate);
            } else {
                return allTransactions;
            }
            break;
        default:
            return allTransactions;
    }

    if (startDate && endDate) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        return allTransactions.filter(t => t.date >= startStr && t.date <= endStr);
    }

    return allTransactions;
}

function getDaysInPeriod() {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (currentPeriod) {
        case 'all': {
            const transactions = storageInstance.getTransactions();
            if (!transactions.length) return 1;
            const dates = transactions.map(t => new Date(t.date));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const diffTime = Math.abs(maxDate - minDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays || 1;
        }
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'custom':
            if (customStartDate && customEndDate) {
                startDate = new Date(customStartDate);
                endDate = new Date(customEndDate);
            } else {
                return 1;
            }
            break;
        default:
            return 1;
    }

    if (startDate && endDate) {
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays || 1;
    }

    return 1;
}

function renderDashboard() {
    const transactions = getFilteredTransactions();
    const daysInPeriod = getDaysInPeriod();
    
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const avgIncome = daysInPeriod > 0 ? totalIncome / daysInPeriod : 0;
    const avgExpense = daysInPeriod > 0 ? totalExpense / daysInPeriod : 0;

    const incomeEl = document.getElementById('stat-income');
    const expenseEl = document.getElementById('stat-expense');
    const avgIncomeEl = document.getElementById('stat-avg-income');
    const avgExpenseEl = document.getElementById('stat-avg-expense');

    if (incomeEl) {
        incomeEl.textContent = totalIncome.toFixed(2) + ' ₽';
        incomeEl.style.color = '#22C55E';
    }
    if (expenseEl) {
        expenseEl.textContent = totalExpense.toFixed(2) + ' ₽';
        expenseEl.style.color = '#EF4444';
    }
    if (avgIncomeEl) {
        avgIncomeEl.textContent = avgIncome.toFixed(2) + ' ₽';
        avgIncomeEl.style.color = '#22C55E';
    }
    if (avgExpenseEl) {
        avgExpenseEl.textContent = avgExpense.toFixed(2) + ' ₽';
        avgExpenseEl.style.color = '#EF4444';
    }

    renderRecentTransactions(transactions.slice(-5).reverse());
    renderChart(transactions);
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;

    if (!transactions.length) {
        container.innerHTML = '<div class="empty-state"><span class="icon">◻</span>Нет транзакций</div>';
        return;
    }

    container.innerHTML = transactions.map(t => {
        const icon = getCategoryIcon(t);
        const color = getCategoryColor(t);
        const formattedDate = formatDateToRussian(t.date);
        const displayName = getCategoryDisplayName(t);
        const amountColor = t.type === 'income' ? '#22C55E' : '#EF4444';
        const sign = t.type === 'income' ? '+' : '-';
        
        return `
            <div class="transaction-item">
                <div class="left">
                    <div class="icon-box" style="color: ${color};">${icon}</div>
                    <div class="info">
                        <div class="title" style="color: ${color};">${displayName}</div>
                        <div class="meta">${formattedDate} • ${t.description || 'Без описания'}</div>
                    </div>
                </div>
                <div class="amount" style="color: ${amountColor};">${sign} ${t.amount.toFixed(2)} ₽</div>
            </div>
        `;
    }).join('');
}

function getCategoryIcon(transaction) {
    if (!transaction) return '◻';
    
    const categoryId = transaction.category || transaction.categoryId;
    if (!categoryId) return '◻';
    
    const categories = storageInstance.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    
    if (cat && cat.icon) {
        return cat.icon;
    }
    
    const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
    if (defaultCat && defaultCat.icon) {
        return defaultCat.icon;
    }
    
    return '◻';
}

function getCategoryColor(transaction) {
    if (!transaction) return '#666666';
    
    const categoryId = transaction.category || transaction.categoryId;
    if (!categoryId) return '#666666';
    
    const categories = storageInstance.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    
    if (cat && cat.color) {
        return cat.color;
    }
    
    return transaction.type === 'income' ? '#22C55E' : '#EF4444';
}

function getCategoryDisplayName(transaction) {
    if (!transaction) return 'Без категории';
    
    if (transaction.categoryName) {
        return transaction.categoryName;
    }
    
    const categoryId = transaction.category || transaction.categoryId;
    if (!categoryId) return 'Без категории';
    
    const categories = storageInstance.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    
    if (cat && cat.name) {
        return cat.name;
    }
    
    const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
    if (defaultCat && defaultCat.name) {
        return defaultCat.name;
    }
    
    return categoryId || 'Без категории';
}

function renderChart(transactions) {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Уничтожаем старый график если есть
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // Если нет данных, показываем сообщение
    if (!transactions.length) {
        const parent = canvas.parentElement;
        const oldMsg = parent.querySelector('.chart-empty-state');
        if (oldMsg) oldMsg.remove();
        
        const msg = document.createElement('div');
        msg.className = 'chart-empty-state';
        msg.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 200px;
            color: var(--color-text-secondary);
            font-size: var(--font-size-sm);
        `;
        msg.innerHTML = `
            <span style="font-size: 32px; opacity: 0.3; display: block; margin-bottom: 8px;">◻</span>
            Нет данных за выбранный период
        `;
        parent.appendChild(msg);
        canvas.style.display = 'none';
        return;
    }

    // Удаляем сообщение если есть
    const parent = canvas.parentElement;
    const oldMsg = parent.querySelector('.chart-empty-state');
    if (oldMsg) oldMsg.remove();
    canvas.style.display = 'block';

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    let labels = [];
    let incomeData = [];
    let expenseData = [];

    // ===== ЛОГИКА ГРУППИРОВКИ В ЗАВИСИМОСТИ ОТ ПЕРИОДА =====
    switch (currentPeriod) {
        case 'all': {
            // Все время: 2 столбца - всего доходов и всего расходов
            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            labels = ['Всего'];
            incomeData = [totalIncome];
            expenseData = [totalExpense];
            break;
        }
        
        case 'year': {
            // Год: группировка по месяцам
            const months = {};
            const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            
            transactions.forEach(t => {
                const date = new Date(t.date);
                const monthKey = date.getMonth();
                if (!months[monthKey]) {
                    months[monthKey] = { income: 0, expense: 0, label: monthNames[monthKey] };
                }
                if (t.type === 'income') {
                    months[monthKey].income += t.amount;
                } else {
                    months[monthKey].expense += t.amount;
                }
            });
            
            // Сортируем по месяцам
            const sortedMonths = Object.keys(months).sort((a, b) => parseInt(a) - parseInt(b));
            labels = sortedMonths.map(m => months[m].label);
            incomeData = sortedMonths.map(m => months[m].income);
            expenseData = sortedMonths.map(m => months[m].expense);
            break;
        }
        
        case 'month':
        case 'custom':
        default: {
            // Месяц или кастомный период: группировка по дням
            const days = {};
            
            transactions.forEach(t => {
                if (!days[t.date]) {
                    days[t.date] = { income: 0, expense: 0 };
                }
                if (t.type === 'income') {
                    days[t.date].income += t.amount;
                } else {
                    days[t.date].expense += t.amount;
                }
            });
            
            const sortedDates = Object.keys(days).sort();
            
            // Форматируем даты для отображения
            labels = sortedDates.map(d => {
                const date = new Date(d);
                return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            });
            incomeData = sortedDates.map(d => days[d].income);
            expenseData = sortedDates.map(d => days[d].expense);
            break;
        }
    }

    // Проверяем что данные не пустые
    if (!labels.length || (incomeData.every(v => v === 0) && expenseData.every(v => v === 0))) {
        const parent = canvas.parentElement;
        const oldMsg = parent.querySelector('.chart-empty-state');
        if (oldMsg) oldMsg.remove();
        
        const msg = document.createElement('div');
        msg.className = 'chart-empty-state';
        msg.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 200px;
            color: var(--color-text-secondary);
            font-size: var(--font-size-sm);
        `;
        msg.innerHTML = `
            <span style="font-size: 32px; opacity: 0.3; display: block; margin-bottom: 8px;">◻</span>
            Нет данных за выбранный период
        `;
        parent.appendChild(msg);
        canvas.style.display = 'none';
        return;
    }

    // Настройка ширины столбцов в зависимости от количества данных
    let barPercentage = 0.6;
    let categoryPercentage = 0.8;
    if (labels.length === 1) {
        barPercentage = 0.3;
        categoryPercentage = 0.4;
    } else if (labels.length <= 5) {
        barPercentage = 0.5;
        categoryPercentage = 0.7;
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Доходы',
                    data: incomeData,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: '#22C55E',
                    borderWidth: 2,
                    borderRadius: 4,
                    barPercentage: barPercentage,
                    categoryPercentage: categoryPercentage
                },
                {
                    label: 'Расходы',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#EF4444',
                    borderWidth: 2,
                    borderRadius: 4,
                    barPercentage: barPercentage,
                    categoryPercentage: categoryPercentage
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
                        boxWidth: 14,
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            let value = context.parsed.y || 0;
                            return label + ': ' + value.toFixed(2) + ' ₽';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: function(value) {
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'K ₽';
                            return value + ' ₽';
                        },
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
                        maxRotation: labels.length > 10 ? 45 : 0,
                        autoSkip: labels.length > 20,
                        maxTicksLimit: 20
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 400
            }
        }
    });
}

function setupEventListeners() {
    const periodBtns = document.querySelectorAll('.period-btn');
    const customInputs = document.querySelector('.custom-period-inputs');
    
    periodBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const period = this.dataset.period;
            
            // Обновляем активную кнопку
            periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            if (period === 'custom') {
                if (customInputs) customInputs.style.display = 'flex';
                const now = new Date();
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const startInput = document.getElementById('period-start');
                const endInput = document.getElementById('period-end');
                if (startInput && !startInput.value) {
                    startInput.value = monthAgo.toISOString().split('T')[0];
                }
                if (endInput && !endInput.value) {
                    endInput.value = now.toISOString().split('T')[0];
                }
                return;
            }
            
            if (customInputs) customInputs.style.display = 'none';
            
            currentPeriod = period;
            customStartDate = null;
            customEndDate = null;
            
            renderDashboard();
            
            const periodLabels = {
                'all': 'Все время',
                'year': 'Год',
                'month': 'Месяц'
            };
            showToast(`Период: ${periodLabels[period] || period}`, 'success');
        });
    });

    document.getElementById('apply-custom-period')?.addEventListener('click', function() {
        const startInput = document.getElementById('period-start');
        const endInput = document.getElementById('period-end');
        
        const start = startInput?.value;
        const end = endInput?.value;

        if (!start || !end) {
            showToast('Выберите обе даты', 'error');
            return;
        }

        if (start > end) {
            showToast('Начальная дата не может быть позже конечной', 'error');
            return;
        }

        customStartDate = start;
        customEndDate = end;
        currentPeriod = 'custom';
        renderDashboard();
        showToast(`Период: ${formatDateShort(start)} — ${formatDateShort(end)}`, 'success');
    });

    document.addEventListener('transaction-added', () => {
        renderDashboard();
    });
    document.addEventListener('transaction-deleted', () => {
        renderDashboard();
    });
    document.addEventListener('theme-changed', () => {
        const transactions = getFilteredTransactions();
        renderChart(transactions);
    });
}

function formatDateShort(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log('[Toast]', message);
    }
}