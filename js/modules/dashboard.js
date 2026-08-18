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

    console.log('getFilteredTransactions - currentPeriod:', currentPeriod);

    switch (currentPeriod) {
        case 'all':
            console.log('Возвращаем все транзакции:', allTransactions.length);
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
                console.log('Кастомные даты не установлены');
                return allTransactions;
            }
            break;
        default:
            return allTransactions;
    }

    if (startDate && endDate) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        console.log(`Фильтр по датам: ${startStr} — ${endStr}`);
        const filtered = allTransactions.filter(t => t.date >= startStr && t.date <= endStr);
        console.log('Отфильтровано:', filtered.length, 'транзакций');
        return filtered;
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
    console.log('renderDashboard вызван, период:', currentPeriod);
    
    const transactions = getFilteredTransactions();
    const daysInPeriod = getDaysInPeriod();
    
    console.log('Транзакций для отображения:', transactions.length);
    console.log('Дней в периоде:', daysInPeriod);
    
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

    if (incomeEl) incomeEl.textContent = totalIncome.toFixed(2) + ' ₽';
    if (expenseEl) expenseEl.textContent = totalExpense.toFixed(2) + ' ₽';
    if (avgIncomeEl) avgIncomeEl.textContent = avgIncome.toFixed(2) + ' ₽';
    if (avgExpenseEl) avgExpenseEl.textContent = avgExpense.toFixed(2) + ' ₽';

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
        
        return `
            <div class="transaction-item">
                <div class="left">
                    <div class="icon-box" style="color: ${color};">${icon}</div>
                    <div class="info">
                        <div class="title" style="color: ${color};">${displayName}</div>
                        <div class="meta">${formattedDate} • ${t.description || 'Без описания'}</div>
                    </div>
                </div>
                <div class="amount">${t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)} ₽</div>
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
    
    return transaction.type === 'income' ? '#000000' : '#666666';
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

    console.log('renderChart - транзакций для графика:', transactions.length);

    // Группируем транзакции по датам
    const grouped = {};
    transactions.forEach(t => {
        if (!grouped[t.date]) grouped[t.date] = { income: 0, expense: 0 };
        if (t.type === 'income') grouped[t.date].income += t.amount;
        else grouped[t.date].expense += t.amount;
    });

    const dates = Object.keys(grouped).sort();
    const incomeData = dates.map(d => grouped[d].income);
    const expenseData = dates.map(d => grouped[d].expense);

    console.log('Даты для графика:', dates.length);

    // Уничтожаем старый график если есть
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // Если нет данных, показываем сообщение
    if (!dates.length) {
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

    // Форматируем даты для отображения
    const formattedLabels = dates.map(d => {
        const date = new Date(d);
        return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    // Если дат много, показываем не все подписи
    let maxLabels = 20;
    let displayLabels = formattedLabels;
    let displayIncomeData = incomeData;
    let displayExpenseData = expenseData;
    
    if (dates.length > maxLabels) {
        const step = Math.ceil(dates.length / maxLabels);
        displayLabels = [];
        displayIncomeData = [];
        displayExpenseData = [];
        for (let i = 0; i < dates.length; i += step) {
            displayLabels.push(formattedLabels[i]);
            displayIncomeData.push(incomeData[i]);
            displayExpenseData.push(expenseData[i]);
        }
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [
                {
                    label: 'Доходы',
                    data: displayIncomeData,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    borderColor: textColor,
                    borderWidth: 1,
                    borderRadius: 2,
                    barPercentage: 0.4,
                    categoryPercentage: 0.6
                },
                {
                    label: 'Расходы',
                    data: displayExpenseData,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    borderColor: textColor,
                    borderWidth: 1,
                    borderRadius: 2,
                    barPercentage: 0.4,
                    categoryPercentage: 0.6
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
                        font: { size: 11 },
                        boxWidth: 12,
                        padding: 12
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
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 15
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
            
            console.log('Нажата кнопка периода:', period);
            
            // Обновляем активную кнопку
            periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            if (period === 'custom') {
                // Показываем поля для выбора дат
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
            
            // Скрываем кастомные поля
            if (customInputs) customInputs.style.display = 'none';
            
            // Устанавливаем период и обновляем данные
            currentPeriod = period;
            customStartDate = null;
            customEndDate = null;
            
            console.log('Применяем период:', period);
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

    // Слушаем события изменения данных
    document.addEventListener('transaction-added', () => {
        console.log('Событие transaction-added');
        renderDashboard();
    });
    document.addEventListener('transaction-deleted', () => {
        console.log('Событие transaction-deleted');
        renderDashboard();
    });
    document.addEventListener('theme-changed', () => {
        console.log('Событие theme-changed');
        const transactions = getFilteredTransactions();
        renderChart(transactions);
    });
}

function getPeriodLabel(period) {
    const labels = {
        'all': 'Все время',
        'year': 'Год',
        'month': 'Месяц',
        'custom': 'Выбранный'
    };
    return labels[period] || period;
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