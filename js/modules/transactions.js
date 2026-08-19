// ===== modules/transactions.js =====
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatDateToRussian } from '../utils/dateHelpers.js';

let storageInstance = null;
let currentFilter = 'all';

export function init(storage) {
    storageInstance = storage;
    currentFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
    renderTransactions();
    setupEventListeners();
    setTimeout(() => renderTransactions(currentFilter), 500);
}

function renderTransactions(filter = currentFilter) {
    const data = storageInstance.getData();
    let transactions = data.transactions || [];
    
    if (filter !== 'all') {
        transactions = transactions.filter(t => t.type === filter);
    }
    
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    container.innerHTML = '';
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'list-scroll';
    
    if (!transactions || transactions.length === 0) {
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
    
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = '';
    transactions.forEach(t => {
        let categoryName = t.categoryName || t.subcategoryName || 'Без категории';
        let categoryIcon = '◻';
        let categoryColor = '#666666';
        
        let catId = t.categoryId || t.category || t.subcategoryId;
        if (catId) {
            const category = storageInstance.getCategory(catId);
            if (category) {
                categoryIcon = category.icon || '◻';
                categoryColor = category.color || '#666666';
                if (!t.categoryName && !t.subcategoryName) {
                    categoryName = category.name;
                }
            }
        }
        
        if (t.subcategoryName) categoryName = t.subcategoryName;
        else if (t.categoryName) categoryName = t.categoryName;
        
        const formattedDate = formatDateToRussian(t.date);
        const hasPhoto = t.photo && t.photo.length > 0;
        const hasComment = t.comment && t.comment.length > 0;
        const amountColor = t.type === 'income' ? '#22C55E' : '#EF4444';
        const sign = t.type === 'income' ? '+' : '-';
        const isDebtPayment = t.isDebtPayment === true;
        
        html += `
            <div class="transaction-item" data-id="${t.id}">
                <div class="left">
                    <div class="category-icon" style="color: ${categoryColor};">${categoryIcon}</div>
                    <div class="details">
                        <div class="title" style="color: ${categoryColor};">${categoryName}${isDebtPayment ? ' 🔄' : ''}</div>
                        <div class="meta">${formattedDate} • ${t.description || 'Без описания'}${hasPhoto ? ' 📷' : ''}${hasComment ? ' 💬' : ''}</div>
                    </div>
                </div>
                <div class="amount" style="color: ${amountColor};">${sign} ${Number(t.amount || 0).toFixed(2)} ₽</div>
                <div class="actions">
                    ${hasPhoto ? `<button class="btn-photo" data-id="${t.id}" title="Показать фото">🖼</button>` : ''}
                    ${hasComment ? `<button class="btn-comment" data-id="${t.id}" title="Показать комментарий">💬</button>` : ''}
                    <button class="btn-edit" data-id="${t.id}">✎</button>
                    <button class="btn-delete" data-id="${t.id}">✕</button>
                </div>
            </div>
        `;
    });
    
    scrollContainer.innerHTML = html;
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
    
    document.querySelectorAll('.btn-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showPhotoModal(id);
        });
    });
    
    document.querySelectorAll('.btn-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showCommentModal(id);
        });
    });
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
    
    document.addEventListener('transaction-added', () => renderTransactions(currentFilter));
    document.addEventListener('transaction-deleted', () => renderTransactions(currentFilter));
    document.addEventListener('debt-updated', () => renderTransactions(currentFilter));
    
    window.addEventListener('storage', (e) => {
        if (e.key === storageInstance.dbName) {
            renderTransactions(currentFilter);
        }
    });
}

function syncLinkedDebt(transaction) {
    if (!transaction || !transaction.isDebtPayment) return;
    const data = storageInstance.getData();
    const debts = data.debts || [];
    const debtIndex = debts.findIndex(debt =>
        (transaction.debtId && debt.id === transaction.debtId) ||
        (Array.isArray(debt.transactionIds) && debt.transactionIds.includes(transaction.id))
    );
    if (debtIndex === -1) return;
    const debt = debts[debtIndex];
    const allTransactions = data.transactions || [];
    const linkedTransactions = allTransactions.filter(t =>
        t.isDebtPayment &&
        t.type === 'expense' &&
        ((t.debtId && t.debtId === debt.id) ||
         (Array.isArray(debt.transactionIds) && debt.transactionIds.includes(t.id)))
    );
    debt.transactionIds = linkedTransactions.map(t => t.id);
    debt.paidAmount = Math.min(
        linkedTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
        Number(debt.amount || 0)
    );
    debts[debtIndex] = debt;
    data.debts = debts;
    storageInstance.saveData(data);
    document.dispatchEvent(new Event('debt-updated'));
}

function deleteTransaction(id) {
    const transaction = storageInstance.getTransaction(id);
    if (!transaction) return;
    
    const displayName = transaction.categoryName || transaction.subcategoryName || 'Без категории';
    const color = '#EF4444';
    
    openModal('Подтверждение удаления', `
        <div style="text-align:center;padding:12px 0;">
            <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
            <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:8px;">
                Вы уверены, что хотите удалить эту транзакцию?
            </p>
            <div style="
                background: var(--color-bg-secondary);
                border-radius: var(--radius-sm);
                padding: 12px 16px;
                margin: 12px 0;
                border-left: 3px solid ${color};
                text-align: left;
            ">
                <div style="font-weight:600;color:${color};font-size:var(--font-size-sm);">
                    ${displayName}
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">
                    ${formatDateToRussian(transaction.date)} • ${transaction.description || 'Без описания'}
                </div>
                <div style="font-size:var(--font-size-lg);font-weight:700;color:var(--color-text);margin-top:4px;">
                    ${transaction.type === 'income' ? '+' : '-'} ${transaction.amount.toFixed(2)} ₽
                </div>
            </div>
            <div style="display:flex;gap:12px;margin-top:16px;justify-content:center;">
                <button class="btn btn-outline" id="cancel-delete" style="flex:1;">Отмена</button>
                <button class="btn btn-danger" id="confirm-delete" style="flex:1;background:var(--color-text);color:var(--color-bg);border-color:var(--color-text);">Удалить</button>
            </div>
        </div>
    `, null);
    
    setTimeout(() => {
        const cancelBtn = document.getElementById('cancel-delete');
        const confirmBtn = document.getElementById('confirm-delete');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
            });
        }
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                storageInstance.deleteTransaction(id);
                syncLinkedDebt(transaction);
                renderTransactions(currentFilter);
                showToast('Транзакция удалена', 'success');
                window.app.refreshHeader();
                document.dispatchEvent(new Event('transaction-deleted'));
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
            });
        }
    }, 100);
}

function showPhotoModal(id) {
    const transaction = storageInstance.getTransaction(id);
    if (!transaction || !transaction.photo) {
        showToast('Фото не найдено', 'error');
        return;
    }
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
        cursor: pointer;
    `;
    modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; position: relative;">
            <button class="modal-close" style="
                position: absolute;
                top: -40px;
                right: 0;
                font-size: 28px;
                background: none;
                border: none;
                cursor: pointer;
                color: #fff;
                padding: 4px 8px;
                z-index: 10;
                transition: transform 0.2s;
            ">✕</button>
            <img src="${transaction.photo}" alt="Фото транзакции" style="
                max-width: 100%;
                max-height: 80vh;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                object-fit: contain;
            ">
            <div style="color: #fff; text-align: center; margin-top: 12px; font-size: 14px; opacity: 0.8;">
                ${transaction.description || 'Без описания'} • ${transaction.amount.toFixed(2)} ₽
                ${transaction.comment ? `<br><span style="font-size:12px;opacity:0.6;">${transaction.comment}</span>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function showCommentModal(id) {
    const transaction = storageInstance.getTransaction(id);
    if (!transaction || !transaction.comment) {
        showToast('Комментарий не найден', 'error');
        return;
    }
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
    `;
    modal.innerHTML = `
        <div style="
            background: var(--color-bg-card);
            border-radius: var(--radius);
            padding: 24px;
            max-width: 420px;
            width: 90%;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-lg);
        ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-size:16px;font-weight:600;color:var(--color-text);">Комментарий</h3>
                <button class="modal-close" style="
                    font-size:18px;
                    background:none;
                    border:none;
                    cursor:pointer;
                    color:var(--color-text-secondary);
                    padding:4px 8px;
                    border-radius:var(--radius-sm);
                    transition:0.2s;
                ">✕</button>
            </div>
            <div style="
                background: var(--color-bg-secondary);
                border-radius: var(--radius-sm);
                padding: 16px;
                border: 1px solid var(--color-border);
                color: var(--color-text);
                font-size: var(--font-size-sm);
                line-height: 1.6;
                word-wrap: break-word;
                white-space: pre-wrap;
            ">
                ${transaction.comment}
            </div>
            <div style="margin-top:12px;font-size:var(--font-size-xs);color:var(--color-text-secondary);">
                ${transaction.description || 'Без описания'} • ${transaction.amount.toFixed(2)} ₽
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function openAddModal() {
    const categories = storageInstance.getCategories();
    const today = new Date().toISOString().split('T')[0];
    
    openModal('Добавить транзакцию', `
        <form id="transaction-form" enctype="multipart/form-data">
            <div style="display: flex; gap: 4px; background: var(--color-bg-secondary); padding: 4px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); margin-bottom: 12px;">
                <button type="button" class="type-btn active" data-type="expense" style="padding: 6px 14px; border: none; background: var(--color-text); color: var(--color-bg); border-radius: var(--radius-sm); font-family: var(--font-family); font-size: var(--font-size-xs); font-weight: 500; cursor: pointer; transition: var(--transition); flex: 1;">Расход</button>
                <button type="button" class="type-btn" data-type="income" style="padding: 6px 14px; border: none; background: transparent; color: var(--color-text-secondary); border-radius: var(--radius-sm); font-family: var(--font-family); font-size: var(--font-size-xs); font-weight: 500; cursor: pointer; transition: var(--transition); flex: 1;">Доход</button>
            </div>
            
            <input name="amount" type="number" step="0.01" placeholder="Сумма" required 
                   style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;">
            
            <select id="transaction-category" name="category" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;appearance:auto;">
                <option value="">Выберите категорию</option>
            </select>
            
            <select id="transaction-subcategory" name="subcategory" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;appearance:auto;">
                <option value="">Выберите подкатегорию</option>
            </select>
            
            <input name="date" type="date" value="${today}" required 
                   style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;">
            
            <textarea name="description" placeholder="Описание" 
                      style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;resize:vertical;min-height:60px;font-size:var(--font-size-sm);box-sizing:border-box;font-family:var(--font-family);"></textarea>
            
            <textarea name="comment" placeholder="Комментарий (необязательно)" 
                      style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;resize:vertical;min-height:40px;font-size:var(--font-size-sm);box-sizing:border-box;font-family:var(--font-family);"></textarea>
            
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:4px;font-weight:500;">Фото (необязательно)</label>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <label for="photo-input" style="
                        display:inline-flex;
                        align-items:center;
                        gap:6px;
                        padding:8px 16px;
                        background:var(--color-bg-secondary);
                        border:1px dashed var(--color-border);
                        border-radius:var(--radius-sm);
                        cursor:pointer;
                        transition:var(--transition);
                        font-size:var(--font-size-xs);
                        color:var(--color-text-secondary);
                    ">
                        <span style="font-size:16px;">📷</span>
                        Выбрать фото
                    </label>
                    <input type="file" id="photo-input" accept="image/*" style="display:none;">
                    <span id="photo-filename" style="font-size:var(--font-size-xs);color:var(--color-text-muted);"></span>
                </div>
                <div id="photo-preview" style="display:none;margin-top:8px;position:relative;">
                    <img id="preview-image" src="" alt="Превью" style="max-width:200px;max-height:150px;border-radius:4px;border:1px solid var(--color-border);object-fit:cover;">
                    <button type="button" id="remove-photo" style="
                        position:absolute;
                        top:-8px;
                        right:-8px;
                        background:var(--color-text);
                        color:var(--color-bg);
                        border:none;
                        border-radius:50%;
                        width:24px;
                        height:24px;
                        cursor:pointer;
                        font-size:14px;
                        line-height:24px;
                        text-align:center;
                        transition:transform 0.2s;
                        box-shadow:0 2px 4px rgba(0,0,0,0.2);
                    ">✕</button>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary" style="width:100%;padding:10px;">Сохранить</button>
        </form>
    `, (formData) => {
        // === ГЛАВНОЕ ИСПРАВЛЕНИЕ: ЯВНО БЕРЁМ ТИП ИЗ КНОПОК ===
        const activeTypeBtn = document.querySelector('.type-btn.active');
        const selectedType = activeTypeBtn ? activeTypeBtn.dataset.type : 'expense';
        
        let categoryId = formData.category;
        if (formData.subcategory) {
            categoryId = formData.subcategory;
        }
        const category = storageInstance.getCategory(categoryId);
        const transaction = {
            type: selectedType, // Теперь тип сохраняется корректно
            amount: parseFloat(formData.amount),
            category: categoryId,
            categoryName: category ? category.name : formData.category,
            date: formData.date,
            description: formData.description || '',
            comment: formData.comment || '',
            photo: formData.photo || '',
            isDebtPayment: false
        };
        storageInstance.addTransaction(transaction);
        renderTransactions(currentFilter);
        showToast('Транзакция добавлена', 'success');
        window.app.refreshHeader();
        document.dispatchEvent(new Event('transaction-added'));
    });
    
    // Обработчики для модалки
    const typeBtns = document.querySelectorAll('.type-btn');
    const categorySelect = document.getElementById('transaction-category');
    const subcategorySelect = document.getElementById('transaction-subcategory');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const previewImage = document.getElementById('preview-image');
    const removePhotoBtn = document.getElementById('remove-photo');
    const photoFilename = document.getElementById('photo-filename');
    let photoData = null;
    
    photoInput?.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            photoFilename.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function(event) {
                photoData = event.target.result;
                previewImage.src = photoData;
                photoPreview.style.display = 'inline-block';
                const form = document.getElementById('transaction-form');
                let hiddenInput = document.getElementById('photo-hidden');
                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'photo';
                    hiddenInput.id = 'photo-hidden';
                    form.appendChild(hiddenInput);
                }
                hiddenInput.value = photoData;
            };
            reader.readAsDataURL(file);
        }
    });
    
    removePhotoBtn?.addEventListener('click', function() {
        photoData = null;
        photoPreview.style.display = 'none';
        photoInput.value = '';
        photoFilename.textContent = '';
        const hidden = document.getElementById('photo-hidden');
        if (hidden) hidden.remove();
    });
    
    typeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            typeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--color-text-secondary)';
            });
            this.classList.add('active');
            this.style.background = 'var(--color-text)';
            this.style.color = 'var(--color-bg)';
            const type = this.dataset.type;
            updateCategoryOptions(type);
        });
    });
    
    function updateCategoryOptions(type) {
        const categories = storageInstance.getCategories();
        const mainCategories = categories.filter(c => c.type === type && !c.parentId);
        const subCategories = categories.filter(c => c.type === type && c.parentId);
        const mainOptions = mainCategories.map(c => {
            const color = c.color || '#666666';
            return `<option value="${c.id}" data-type="${c.type}" style="color: ${color};">${c.icon || '◻'} ${c.name}</option>`;
        }).join('');
        categorySelect.innerHTML = `
            <option value="">Выберите категорию</option>
            ${mainOptions}
        `;
        subcategorySelect.innerHTML = `<option value="">Выберите подкатегорию</option>`;
        const subMap = {};
        subCategories.forEach(sub => {
            if (!subMap[sub.parentId]) {
                subMap[sub.parentId] = [];
            }
            subMap[sub.parentId].push(sub);
        });
        categorySelect.dataset.subMap = JSON.stringify(subMap);
    }
    
    categorySelect.addEventListener('change', function() {
        const selectedId = this.value;
        const subMap = JSON.parse(this.dataset.subMap || '{}');
        const subCategories = subMap[selectedId] || [];
        const type = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
        const categories = storageInstance.getCategories();
        const subs = categories.filter(c => c.type === type && c.parentId === selectedId);
        const subOptions = subs.map(sub => {
            const color = sub.color || '#666666';
            return `<option value="${sub.id}" style="color: ${color};">${sub.name}</option>`;
        }).join('');
        subcategorySelect.innerHTML = `
            <option value="">Выберите подкатегорию</option>
            ${subOptions}
        `;
    });
    
    updateCategoryOptions('expense');
}

function openEditModal(id) {
    const transaction = storageInstance.getTransaction(id);
    if (!transaction) return;
    
    const categories = storageInstance.getCategories();
    const selectedCat = categories.find(c => c.id === transaction.category);
    const isSubCategory = selectedCat && selectedCat.parentId;
    const parentId = isSubCategory ? selectedCat.parentId : null;
    const transactionType = transaction.type || 'expense';
    const today = new Date().toISOString().split('T')[0];
    
    const getMainOptions = (type, selectedId) => {
        const mainCats = categories.filter(c => c.type === type && !c.parentId);
        return mainCats.map(c => {
            const color = c.color || '#666666';
            const selected = c.id === selectedId ? 'selected' : '';
            return `<option value="${c.id}" ${selected} style="color: ${color};">${c.icon || '◻'} ${c.name}</option>`;
        }).join('');
    };
    
    const getSubOptions = (parentId, type, selectedId) => {
        const subs = categories.filter(c => c.type === type && c.parentId === parentId);
        return subs.map(sub => {
            const color = sub.color || '#666666';
            const selected = sub.id === selectedId ? 'selected' : '';
            return `<option value="${sub.id}" ${selected} style="color: ${color};">${sub.name}</option>`;
        }).join('');
    };
    
    const mainOptions = getMainOptions(transactionType, isSubCategory ? parentId : transaction.category);
    const subOptions = isSubCategory ? getSubOptions(parentId, transactionType, transaction.category) : '';
    const hasPhoto = transaction.photo && transaction.photo.length > 0;
    const hasComment = transaction.comment && transaction.comment.length > 0;
    
    openModal('Редактировать транзакцию', `
        <form id="transaction-form" enctype="multipart/form-data">
            <div style="display: flex; gap: 4px; background: var(--color-bg-secondary); padding: 4px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); margin-bottom: 12px;">
                <button type="button" class="type-btn ${transactionType === 'expense' ? 'active' : ''}" data-type="expense" style="padding: 6px 14px; border: none; ${transactionType === 'expense' ? 'background: var(--color-text); color: var(--color-bg);' : 'background: transparent; color: var(--color-text-secondary);'} border-radius: var(--radius-sm); font-family: var(--font-family); font-size: var(--font-size-xs); font-weight: 500; cursor: pointer; transition: var(--transition); flex: 1;">Расход</button>
                <button type="button" class="type-btn ${transactionType === 'income' ? 'active' : ''}" data-type="income" style="padding: 6px 14px; border: none; ${transactionType === 'income' ? 'background: var(--color-text); color: var(--color-bg);' : 'background: transparent; color: var(--color-text-secondary);'} border-radius: var(--radius-sm); font-family: var(--font-family); font-size: var(--font-size-xs); font-weight: 500; cursor: pointer; transition: var(--transition); flex: 1;">Доход</button>
            </div>
            
            <input name="amount" type="number" step="0.01" value="${transaction.amount}" placeholder="Сумма" required 
                   style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;">
            
            <select id="transaction-category" name="category" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;appearance:auto;">
                <option value="">Выберите категорию</option>
                ${mainOptions}
            </select>
            
            <select id="transaction-subcategory" name="subcategory" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;appearance:auto;">
                <option value="">Выберите подкатегорию</option>
                ${subOptions}
            </select>
            
            <input name="date" type="date" value="${transaction.date || today}" required 
                   style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;font-size:var(--font-size-sm);box-sizing:border-box;">
            
            <textarea name="description" placeholder="Описание" 
                      style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;resize:vertical;min-height:60px;font-size:var(--font-size-sm);box-sizing:border-box;font-family:var(--font-family);">${transaction.description || ''}</textarea>
            
            <textarea name="comment" placeholder="Комментарий (необязательно)" 
                      style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;resize:vertical;min-height:40px;font-size:var(--font-size-sm);box-sizing:border-box;font-family:var(--font-family);">${transaction.comment || ''}</textarea>
            
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:4px;font-weight:500;">Фото</label>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <label for="photo-input" style="
                        display:inline-flex;
                        align-items:center;
                        gap:6px;
                        padding:8px 16px;
                        background:var(--color-bg-secondary);
                        border:1px dashed var(--color-border);
                        border-radius:var(--radius-sm);
                        cursor:pointer;
                        transition:var(--transition);
                        font-size:var(--font-size-xs);
                        color:var(--color-text-secondary);
                    ">
                        <span style="font-size:16px;">📷</span>
                        ${hasPhoto ? 'Заменить фото' : 'Выбрать фото'}
                    </label>
                    <input type="file" id="photo-input" accept="image/*" style="display:none;">
                    <span id="photo-filename" style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${hasPhoto ? 'Фото выбрано' : ''}</span>
                </div>
                <div id="photo-preview" style="${hasPhoto ? 'display:inline-block;' : 'display:none;'}margin-top:8px;position:relative;">
                    <img id="preview-image" src="${transaction.photo || ''}" alt="Превью" style="max-width:200px;max-height:150px;border-radius:4px;border:1px solid var(--color-border);object-fit:cover;">
                    <button type="button" id="remove-photo" style="
                        position:absolute;
                        top:-8px;
                        right:-8px;
                        background:var(--color-text);
                        color:var(--color-bg);
                        border:none;
                        border-radius:50%;
                        width:24px;
                        height:24px;
                        cursor:pointer;
                        font-size:14px;
                        line-height:24px;
                        text-align:center;
                        transition:transform 0.2s;
                        box-shadow:0 2px 4px rgba(0,0,0,0.2);
                    ">✕</button>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary" style="width:100%;padding:10px;">Обновить</button>
        </form>
    `, (formData) => {
        // === ГЛАВНОЕ ИСПРАВЛЕНИЕ: ЯВНО БЕРЁМ ТИП ИЗ КНОПОК ===
        const activeTypeBtn = document.querySelector('.type-btn.active');
        const selectedType = activeTypeBtn ? activeTypeBtn.dataset.type : 'expense';
        
        let categoryId = formData.category;
        if (formData.subcategory) {
            categoryId = formData.subcategory;
        }
        const category = storageInstance.getCategory(categoryId);
        const updated = {
            type: selectedType, // Теперь тип сохраняется корректно
            amount: parseFloat(formData.amount),
            category: categoryId,
            categoryName: category ? category.name : formData.category,
            date: formData.date,
            description: formData.description || '',
            comment: formData.comment || '',
            photo: formData.photo || transaction.photo || '',
            isDebtPayment: transaction.isDebtPayment || false
        };
        const savedTransaction = storageInstance.updateTransaction(id, updated);
        syncLinkedDebt(savedTransaction);
        renderTransactions(currentFilter);
        showToast('Транзакция обновлена', 'success');
        window.app.refreshHeader();
        document.dispatchEvent(new Event('transaction-added'));
    });
    
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const previewImage = document.getElementById('preview-image');
    const removePhotoBtn = document.getElementById('remove-photo');
    const photoFilename = document.getElementById('photo-filename');
    let photoData = transaction.photo || null;
    
    photoInput?.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            photoFilename.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function(event) {
                photoData = event.target.result;
                previewImage.src = photoData;
                photoPreview.style.display = 'inline-block';
                const form = document.getElementById('transaction-form');
                let hiddenInput = document.getElementById('photo-hidden');
                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'photo';
                    hiddenInput.id = 'photo-hidden';
                    form.appendChild(hiddenInput);
                }
                hiddenInput.value = photoData;
            };
            reader.readAsDataURL(file);
        }
    });
    
    removePhotoBtn?.addEventListener('click', function() {
        photoData = null;
        photoPreview.style.display = 'none';
        photoInput.value = '';
        photoFilename.textContent = '';
        const hidden = document.getElementById('photo-hidden');
        if (hidden) hidden.remove();
        const form = document.getElementById('transaction-form');
        let hiddenInput = document.getElementById('photo-hidden');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'photo';
            hiddenInput.id = 'photo-hidden';
            form.appendChild(hiddenInput);
        }
        hiddenInput.value = '';
    });
    
    const typeBtns = document.querySelectorAll('.type-btn');
    const categorySelect = document.getElementById('transaction-category');
    const subcategorySelect = document.getElementById('transaction-subcategory');
    
    typeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            typeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--color-text-secondary)';
            });
            this.classList.add('active');
            this.style.background = 'var(--color-text)';
            this.style.color = 'var(--color-bg)';
            const type = this.dataset.type;
            updateCategoryOptions(type);
        });
    });
    
    function updateCategoryOptions(type) {
        const categories = storageInstance.getCategories();
        const mainCategories = categories.filter(c => c.type === type && !c.parentId);
        const subCategories = categories.filter(c => c.type === type && c.parentId);
        const mainOptions = mainCategories.map(c => {
            const color = c.color || '#666666';
            return `<option value="${c.id}" data-type="${c.type}" style="color: ${color};">${c.icon || '◻'} ${c.name}</option>`;
        }).join('');
        categorySelect.innerHTML = `
            <option value="">Выберите категорию</option>
            ${mainOptions}
        `;
        subcategorySelect.innerHTML = `<option value="">Выберите подкатегорию</option>`;
        const subMap = {};
        subCategories.forEach(sub => {
            if (!subMap[sub.parentId]) {
                subMap[sub.parentId] = [];
            }
            subMap[sub.parentId].push(sub);
        });
        categorySelect.dataset.subMap = JSON.stringify(subMap);
    }
    
    categorySelect.addEventListener('change', function() {
        const selectedId = this.value;
        const subMap = JSON.parse(this.dataset.subMap || '{}');
        const subCategories = subMap[selectedId] || [];
        const type = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
        const categories = storageInstance.getCategories();
        const subs = categories.filter(c => c.type === type && c.parentId === selectedId);
        const subOptions = subs.map(sub => {
            const color = sub.color || '#666666';
            return `<option value="${sub.id}" style="color: ${color};">${sub.name}</option>`;
        }).join('');
        subcategorySelect.innerHTML = `
            <option value="">Выберите подкатегорию</option>
            ${subOptions}
        `;
    });
    
    updateCategoryOptions(transactionType);
}