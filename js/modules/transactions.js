// ===== МОДУЛЬ: ТРАНЗАКЦИИ =====
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatDateToRussian } from '../utils/dateHelpers.js';

let storageInstance = null;
let currentFilter = 'all';

export function init(storage) {
    storageInstance = storage;
    renderTransactions();
    setupEventListeners();
}

function renderTransactions(filter = currentFilter) {
    let transactions = storageInstance.getTransactions();
    
    if (filter !== 'all') {
        transactions = transactions.filter(t => t.type === filter);
    }
    
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'list-scroll';
    
    if (!transactions.length) {
        scrollContainer.innerHTML = `
            <div class="empty-state">
                <span class="icon">◻</span>
                <p>Нет транзакций</p>
                <button class="btn btn-primary" id="add-first-btn" style="margin-top:12px;">+ Добавить</button>
            </div>
        `;
        container.appendChild(scrollContainer);
        document.getElementById('add-first-btn')?.addEventListener('click', openAddModal);
        return;
    }
    
    scrollContainer.innerHTML = transactions.map(t => {
        const icon = getCategoryIcon(t.category);
        const color = getCategoryColor(t.category);
        const formattedDate = formatDateToRussian(t.date);
        return `
            <div class="transaction-item" data-id="${t.id}">
                <div class="left">
                    <div class="category-icon" style="color: ${color};">${icon}</div>
                    <div class="details">
                        <div class="title" style="color: ${color};">${t.categoryName || t.category}</div>
                        <div class="meta">${formattedDate} • ${t.description || 'Без описания'}</div>
                    </div>
                </div>
                <div class="amount">${t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)} ₽</div>
                <div class="actions">
                    <button class="btn-edit" data-id="${t.id}">✎</button>
                    <button class="btn-delete" data-id="${t.id}">✕</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.appendChild(scrollContainer);
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteTransaction(id);
        });
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            openEditModal(id);
        });
    });
}

function getCategoryIcon(categoryId) {
    if (!categoryId) return '◻';
    const categories = storageInstance.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    return cat && cat.icon ? cat.icon : '◻';
}

function getCategoryColor(categoryId) {
    if (!categoryId) return '#666666';
    const categories = storageInstance.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    return cat && cat.color ? cat.color : '#666666';
}

function setupEventListeners() {
    document.getElementById('add-transaction-btn')?.addEventListener('click', openAddModal);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            currentFilter = filter;
            renderTransactions(currentFilter);
        });
    });
    
    document.getElementById('search-transactions')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.transaction-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    });
}

function deleteTransaction(id) {
    if (confirm('Удалить транзакцию?')) {
        storageInstance.deleteTransaction(id);
        renderTransactions(currentFilter);
        showToast('Транзакция удалена', 'success');
        window.app.refreshHeader();
        document.dispatchEvent(new Event('transaction-deleted'));
    }
}

function openAddModal() {
    const categories = storageInstance.getCategoriesByType('income');
    const expenseCategories = storageInstance.getCategoriesByType('expense');
    const allCategories = [...categories, ...expenseCategories];
    
    const categoryOptions = allCategories.map(c => {
        const color = c.color || '#666666';
        return `<option value="${c.id}" style="color: ${color};">${c.icon || '◻'} ${c.name} ${c.parentId ? '↳' : ''}</option>`;
    }).join('');
    
    openModal('Добавить транзакцию', `
        <form id="transaction-form">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <select name="type" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
                    <option value="income">Доход</option>
                    <option value="expense">Расход</option>
                </select>
                <input name="amount" type="number" placeholder="Сумма" required 
                       style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
            </div>
            <select name="category" required style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;">
                ${categoryOptions}
            </select>
            <input name="date" type="date" required 
                   style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;">
            <textarea name="description" placeholder="Описание" 
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;resize:vertical;min-height:60px;"></textarea>
            <button type="submit" class="btn btn-primary" style="width:100%;">Сохранить</button>
        </form>
    `, (formData) => {
        const category = storageInstance.getCategory(formData.category);
        const transaction = {
            type: formData.type,
            amount: parseFloat(formData.amount),
            category: formData.category,
            categoryName: category ? category.name : formData.category,
            date: formData.date,
            description: formData.description || ''
        };
        storageInstance.addTransaction(transaction);
        renderTransactions(currentFilter);
        showToast('Транзакция добавлена', 'success');
        window.app.refreshHeader();
        document.dispatchEvent(new Event('transaction-added'));
    });
}

function openEditModal(id) {
    const transaction = storageInstance.getTransaction(id);
    if (!transaction) return;
    
    const categories = storageInstance.getCategoriesByType('income');
    const expenseCategories = storageInstance.getCategoriesByType('expense');
    const allCategories = [...categories, ...expenseCategories];
    
    const categoryOptions = allCategories.map(c => {
        const color = c.color || '#666666';
        return `<option value="${c.id}" ${c.id === transaction.category ? 'selected' : ''} style="color: ${color};">${c.icon || '◻'} ${c.name} ${c.parentId ? '↳' : ''}</option>`;
    }).join('');
    
    openModal('Редактировать транзакцию', `
        <form id="transaction-form">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <select name="type" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
                    <option value="income" ${transaction.type === 'income' ? 'selected' : ''}>Доход</option>
                    <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Расход</option>
                </select>
                <input name="amount" type="number" value="${transaction.amount}" placeholder="Сумма" required 
                       style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
            </div>
            <select name="category" required style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;">
                ${categoryOptions}
            </select>
            <input name="date" type="date" value="${transaction.date}" required 
                   style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;">
            <textarea name="description" placeholder="Описание" 
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;resize:vertical;min-height:60px;">${transaction.description || ''}</textarea>
            <button type="submit" class="btn btn-primary" style="width:100%;">Обновить</button>
        </form>
    `, (formData) => {
        const category = storageInstance.getCategory(formData.category);
        const updated = {
            type: formData.type,
            amount: parseFloat(formData.amount),
            category: formData.category,
            categoryName: category ? category.name : formData.category,
            date: formData.date,
            description: formData.description || ''
        };
        storageInstance.updateTransaction(id, updated);
        renderTransactions(currentFilter);
        showToast('Транзакция обновлена', 'success');
        window.app.refreshHeader();
        document.dispatchEvent(new Event('transaction-added'));
    });
}