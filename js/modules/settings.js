// ===== МОДУЛЬ: НАСТРОЙКИ =====
import { CURRENCIES } from '../config/constants.js';
import { showToast } from '../components/toast.js';

let storageInstance = null;

export function init(storage) {
    storageInstance = storage;
    renderSettings();
    setupEventListeners();
}

function renderSettings() {
    const settings = storageInstance.getSettings();
    
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        const currentCurrency = settings.currency || 'RUB';
        currencySelect.innerHTML = Object.entries(CURRENCIES).map(([key, val]) => 
            `<option value="${key}" ${key === currentCurrency ? 'selected' : ''}>${val.symbol} ${val.name}</option>`
        ).join('');
    }
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const currentTheme = settings.theme || 'light';
        themeToggle.checked = currentTheme === 'dark';
    }
}

function setupEventListeners() {
    document.getElementById('currency')?.addEventListener('change', (e) => {
        storageInstance.updateSettings({ currency: e.target.value });
        showToast('Валюта обновлена', 'success');
        window.app.refreshHeader();
    });
    
    document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
        window.app.toggleTheme();
    });
    
    document.getElementById('export-data')?.addEventListener('click', exportData);
    document.getElementById('import-data')?.addEventListener('click', () => document.getElementById('import-file')?.click());
    document.getElementById('import-file')?.addEventListener('change', importData);
    document.getElementById('clear-data')?.addEventListener('click', clearAllData);
}

function exportData() {
    const data = storageInstance.getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Данные экспортированы', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.transactions && data.categories) {
                storageInstance.saveData(data);
                showToast('Данные импортированы', 'success');
                window.app.refreshHeader();
                location.reload();
            } else {
                showToast('Неверный формат файла', 'error');
            }
        } catch (err) {
            showToast('Ошибка импорта', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    if (confirm('ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ! Продолжить?')) {
        if (confirm('Вы уверены? Это действие нельзя отменить!')) {
            localStorage.removeItem('budgetApp');
            showToast('Все данные удалены', 'info');
            setTimeout(() => location.reload(), 1000);
        }
    }
}