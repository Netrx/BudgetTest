// ===== МОДУЛЬ: КАТЕГОРИИ =====
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { createColorPicker } from '../components/colorPicker.js';
import { CATEGORY_ICONS, CATEGORY_TYPES } from '../config/constants.js';

let storageInstance = null;
let currentType = 'income';
let colorPickerInstance = null;

export function init(storage) {
    storageInstance = storage;
    renderCategories();
    setupEventListeners();
}

function renderCategories() {
    const categories = storageInstance.getCategoriesByType(currentType);
    const tree = buildCategoryTree(categories);
    const container = document.getElementById('categories-grid');

    let html = `
        <div class="category-card add-category-card" id="add-category-card">
            <span class="plus">+</span>
            <span class="text">Добавить категорию</span>
        </div>
    `;

    tree.forEach(cat => {
        const count = getTransactionCount(cat.id);
        const subCount = cat.children.reduce((sum, sub) => sum + getTransactionCount(sub.id), 0);
        const totalCount = count + subCount;
        const color = cat.color || '#666666';

        html += `
            <div class="category-card" data-cat-id="${cat.id}">
                <div class="category-header">
                    <span class="category-icon" style="color: ${color};">${cat.icon || '◻'}</span>
                    <span class="category-name" style="color: ${color};">${cat.name}</span>
                    <button class="btn-add-sub" data-id="${cat.id}">+</button>
                    <button class="btn-edit-cat" data-id="${cat.id}">✎</button>
                    <button class="btn-delete-cat" data-id="${cat.id}">✕</button>
                </div>
                <div class="category-count">${totalCount} тр.</div>
                ${renderSubcategories(cat.children)}
            </div>
        `;
    });

    container.innerHTML = html;

    document.getElementById('add-category-card')?.addEventListener('click', () => openAddCategoryModal(null));

    document.querySelectorAll('.btn-add-sub').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parentId = e.currentTarget.dataset.id;
            openAddCategoryModal(parentId);
        });
    });

    document.querySelectorAll('.btn-edit-cat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            openEditCategoryModal(id);
        });
    });

    document.querySelectorAll('.btn-delete-cat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            deleteCategory(id);
        });
    });

    document.querySelectorAll('.sub-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            openEditCategoryModal(id);
        });
    });

    document.querySelectorAll('.sub-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            deleteCategory(id);
        });
    });
}

function renderSubcategories(children) {
    if (!children || !children.length) return '';

    let html = '<div class="subcategories">';
    children.forEach(sub => {
        const count = getTransactionCount(sub.id);
        const color = sub.color || '#666666';
        html += `
            <div class="subcategory-item">
                <span class="sub-icon" style="color: ${color};">${sub.icon || '◻'}</span>
                <span class="sub-name" style="color: ${color};">${sub.name}</span>
                <span class="sub-count">${count}</span>
                <div class="sub-actions">
                    <button class="sub-edit" data-id="${sub.id}">✎</button>
                    <button class="sub-delete" data-id="${sub.id}">✕</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function buildCategoryTree(categories) {
    const mainCategories = categories.filter(c => !c.parentId);
    return mainCategories.map(cat => ({
        ...cat,
        children: categories.filter(c => c.parentId === cat.id)
    }));
}

function getTransactionCount(categoryId) {
    const transactions = storageInstance.getTransactions();
    return transactions.filter(t => t.category === categoryId).length;
}

function setupEventListeners() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentType = e.currentTarget.dataset.type;
            renderCategories();
        });
    });

    document.getElementById('add-category-btn')?.addEventListener('click', () => openAddCategoryModal(null));

    document.addEventListener('transaction-added', () => renderCategories());
    document.addEventListener('transaction-deleted', () => renderCategories());
}

function openAddCategoryModal(parentId = null) {
    const iconOptions = CATEGORY_ICONS.map(icon => 
        `<option value="${icon.value}">${icon.value} ${icon.label}</option>`
    ).join('');

    const typeOptions = Object.values(CATEGORY_TYPES).map(type => 
        `<option value="${type}">${type === 'income' ? 'Доход' : 'Расход'}</option>`
    ).join('');

    const parentCategories = storageInstance.getCategoriesByType(currentType).filter(c => !c.parentId);
    const parentOptions = parentCategories.map(c => 
        `<option value="${c.id}">${c.icon || '◻'} ${c.name}</option>`
    ).join('');

    const title = parentId ? 'Добавить подкатегорию' : 'Добавить категорию';
    const defaultColor = '#3B82F6';

    openModal(title, `
        <form id="category-form">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <select name="type" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
                    ${typeOptions}
                </select>
                <select name="icon" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
                    ${iconOptions}
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <input name="name" type="text" placeholder="Название категории" required 
                       style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
            </div>
            
            <!-- Color Picker -->
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:6px;">Выберите цвет</label>
                <div id="color-picker-container"></div>
                <input type="hidden" name="color" id="selected-color" value="${defaultColor}">
            </div>
            
            ${parentId ? `<input type="hidden" name="parentId" value="${parentId}">` : `
                <select name="parentId" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);margin-bottom:12px;">
                    <option value="">Без родителя (главная)</option>
                    ${parentOptions}
                </select>
            `}
            <button type="submit" class="btn btn-primary" style="width:100%;">Сохранить</button>
        </form>
    `, (formData) => {
        const category = {
            name: formData.name,
            icon: formData.icon || '◻',
            color: formData.color || defaultColor,
            type: formData.type || currentType,
            parentId: formData.parentId || parentId || null
        };
        storageInstance.addCategory(category);
        renderCategories();
        showToast('Категория добавлена', 'success');
    });

    // Инициализируем Color Picker после открытия модалки
    setTimeout(() => {
        if (document.getElementById('color-picker-container')) {
            colorPickerInstance = createColorPicker(
                'color-picker-container',
                defaultColor,
                (color) => {
                    document.getElementById('selected-color').value = color;
                }
            );
        }
    }, 100);
}

function openEditCategoryModal(id) {
    const category = storageInstance.getCategory(id);
    if (!category) return;

    const iconOptions = CATEGORY_ICONS.map(icon => 
        `<option value="${icon.value}" ${icon.value === category.icon ? 'selected' : ''}>${icon.value} ${icon.label}</option>`
    ).join('');

    const typeOptions = Object.values(CATEGORY_TYPES).map(type => 
        `<option value="${type}" ${type === category.type ? 'selected' : ''}>${type === 'income' ? 'Доход' : 'Расход'}</option>`
    ).join('');

    const color = category.color || '#3B82F6';

    openModal('Редактировать категорию', `
        <form id="category-form">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <select name="type" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
                    ${typeOptions}
                </select>
                <select name="icon" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
                    ${iconOptions}
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <input name="name" type="text" value="${category.name}" placeholder="Название категории" required 
                       style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text);">
            </div>
            
            <!-- Color Picker -->
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:6px;">Выберите цвет</label>
                <div id="color-picker-container"></div>
                <input type="hidden" name="color" id="selected-color" value="${color}">
            </div>
            
            <button type="submit" class="btn btn-primary" style="width:100%;">Обновить</button>
        </form>
    `, (formData) => {
        const updated = {
            name: formData.name,
            icon: formData.icon || '◻',
            color: formData.color || '#3B82F6',
            type: formData.type
        };
        storageInstance.updateCategory(id, updated);
        renderCategories();
        showToast('Категория обновлена', 'success');
    });

    // Инициализируем Color Picker после открытия модалки
    setTimeout(() => {
        if (document.getElementById('color-picker-container')) {
            colorPickerInstance = createColorPicker(
                'color-picker-container',
                color,
                (color) => {
                    document.getElementById('selected-color').value = color;
                }
            );
        }
    }, 100);
}

function deleteCategory(id) {
    const category = storageInstance.getCategory(id);
    if (!category) return;

    const children = storageInstance.getSubCategories(id);
    const message = children.length > 0 
        ? `Удалить категорию "${category.name}" и все её подкатегории (${children.length})?` 
        : `Удалить категорию "${category.name}"?`;

    if (confirm(message)) {
        storageInstance.deleteCategory(id);
        renderCategories();
        showToast('Категория удалена', 'success');
    }
}