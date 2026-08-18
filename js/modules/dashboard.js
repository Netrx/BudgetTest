// ===== МОДУЛЬ: ДАШБОРД =====
import { showToast } from '../components/toast.js';
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
        const icon = getCategoryIcon(t.category);
        const color = getCategoryColor(t.category);
        const formattedDate = formatDateToRussian(t.date);
        return `
            <div class="transaction-item">
                <div class="left">
                    <div class="icon-box" style="color: ${color};">${icon}</div>
                    <div class="info">
                        <div class="title" style="color: ${color};">${t.categoryName || t.category}</div>
                        <div class="meta">${formattedDate} • ${t.description || 'Без описания'}</div>
                    </div>
                </div>
                <div class="amount">${t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)} ₽</div>
            </div>
        `;
    }).join('');
}

function getCategoryIcon(categoryId) {
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

function getCategoryColor(categoryId) {
    if (!categoryId) return '#666666';
    
    const categories = storageInstance.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    
    if (cat && cat.color) {
        return cat.color;
    }
    
    const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
    if (defaultCat && defaultCat.color) {
        return defaultCat.color;
    }
    
    return '#666666';
}

function renderChart(transactions) {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grouped = {};
    transactions.forEach(t => {
        if (!grouped[t.date]) grouped[t.date] = { income: 0, expense: 0 };
        if (t.type === 'income') grouped[t.date].income += t.amount;
        else grouped[t.date].expense += t.amount;
    });

    const dates = Object.keys(grouped).sort();
    const incomeData = dates.map(d => grouped[d].income);
    const expenseData = dates.map(d => grouped[d].expense);

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Доходы',
                    data: incomeData,
                    backgroundColor: 'rgb(16, 185, 129)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    borderRadius: 0,
                    barPercentage: 0.5,
                    categoryPercentage: 0.7
                },
                {
                    label: 'Расходы',
                    data: expenseData,
                    backgroundColor: 'rgb(239, 68, 68)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    borderRadius: 0,
                    barPercentage: 0.5,
                    categoryPercentage: 0.7
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
                        font: { size: 12, weight: '500' },
                        boxWidth: 14,
                        boxHeight: 14,
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'rect'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: value => value.toLocaleString() + ' ₽',
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
                duration: 500
            }
        }
    });
}

function setupEventListeners() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.currentTarget.dataset.period;

            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const customInputs = document.querySelector('.custom-period-inputs');
            if (period === 'custom') {
                if (customInputs) customInputs.style.display = 'flex';
                const now = new Date();
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const startInput = document.getElementById('period-start');
                const endInput = document.getElementById('period-end');
                if (startInput) startInput.value = monthAgo.toISOString().split('T')[0];
                if (endInput) endInput.value = now.toISOString().split('T')[0];
            } else {
                if (customInputs) customInputs.style.display = 'none';
                currentPeriod = period;
                renderDashboard();
            }
        });
    });

    document.getElementById('apply-custom-period')?.addEventListener('click', () => {
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
        showToast(`Период: ${start} — ${end}`, 'success');
    });

    document.addEventListener('transaction-added', renderDashboard);
    document.addEventListener('transaction-deleted', renderDashboard);
    document.addEventListener('theme-changed', () => {
        const transactions = getFilteredTransactions();
        renderChart(transactions);
    });
}