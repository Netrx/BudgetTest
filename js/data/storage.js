import { DEFAULT_CATEGORIES } from '../config/constants.js';

export class Storage {
    constructor() {
        this.dbName = 'budgetApp';
        this.initDB();
    }

    initDB() {
        let data = localStorage.getItem(this.dbName);
        
        if (!data) {
            const initialData = {
                transactions: [],
                categories: DEFAULT_CATEGORIES,
                settings: {
                    currency: 'RUB',
                    theme: 'light'
                }
            };
            localStorage.setItem(this.dbName, JSON.stringify(initialData));
            return;
        }
        
        this.migrateData();
    }

    migrateData() {
        const data = this.getData();
        let needsUpdate = false;

        if (!data.version) {
            const oldData = data;
            const newData = {
                version: 6,
                expenseCategories: [],
                incomeCategories: [],
                debtCategories: [],
                transactions: oldData.transactions || []
            };

            if (oldData.categories) {
                const incomeCats = oldData.categories.filter(c => c.type === 'income');
                const expenseCats = oldData.categories.filter(c => c.type === 'expense');

                const incomeMap = {};
                const expenseMap = {};

                incomeCats.forEach(cat => {
                    if (!cat.parentId) {
                        const newCat = {
                            id: cat.id,
                            name: cat.name,
                            subcategories: []
                        };
                        incomeMap[cat.id] = newCat;
                        newData.incomeCategories.push(newCat);
                    }
                });

                expenseCats.forEach(cat => {
                    if (!cat.parentId) {
                        const newCat = {
                            id: cat.id,
                            name: cat.name,
                            subcategories: []
                        };
                        expenseMap[cat.id] = newCat;
                        newData.expenseCategories.push(newCat);
                    }
                });

                incomeCats.forEach(cat => {
                    if (cat.parentId && incomeMap[cat.parentId]) {
                        incomeMap[cat.parentId].subcategories.push({
                            id: cat.id,
                            name: cat.name
                        });
                    }
                });

                expenseCats.forEach(cat => {
                    if (cat.parentId && expenseMap[cat.parentId]) {
                        expenseMap[cat.parentId].subcategories.push({
                            id: cat.id,
                            name: cat.name
                        });
                    }
                });

                newData.transactions = oldData.transactions.map(t => {
                    const newT = { ...t };
                    if (t.type === 'income') {
                        newT.incomeCategoryId = t.category || '';
                        newT.incomeCategoryName = t.categoryName || '';
                        delete newT.category;
                        delete newT.categoryName;
                        delete newT.subcategoryId;
                        delete newT.subcategoryName;
                    } else {
                        const cat = expenseCats.find(c => c.id === t.category);
                        if (cat) {
                            newT.categoryId = cat.parentId || cat.id;
                            newT.categoryName = cat.parentId ? 
                                (expenseMap[cat.parentId]?.name || '') : cat.name;
                            if (cat.parentId) {
                                newT.subcategoryId = cat.id;
                                newT.subcategoryName = cat.name;
                            } else {
                                newT.subcategoryId = '';
                                newT.subcategoryName = '';
                            }
                        }
                        delete newT.category;
                        delete newT.categoryName;
                    }
                    newT.photo = t.photo || '';
                    return newT;
                });
            }

            needsUpdate = true;
            localStorage.setItem(this.dbName, JSON.stringify(newData));
        }

        const currentData = this.getData();
        let hasPhotoField = true;
        if (currentData.transactions && currentData.transactions.length > 0) {
            hasPhotoField = currentData.transactions.some(t => t.photo !== undefined);
        }
        if (!hasPhotoField && currentData.transactions) {
            currentData.transactions = currentData.transactions.map(t => ({
                ...t,
                photo: t.photo || ''
            }));
            needsUpdate = true;
        }

        if (needsUpdate) {
            this.saveData(currentData);
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    getTransactions() {
        return this.getData().transactions || [];
    }

    getTransaction(id) {
        return this.getTransactions().find(t => t.id === id);
    }

    addTransaction(transaction) {
        const data = this.getData();
        transaction.id = Date.now().toString();
        transaction.date = transaction.date || new Date().toISOString().split('T')[0];
        transaction.photo = transaction.photo || '';
        data.transactions.push(transaction);
        this.saveData(data);
        return transaction;
    }

    updateTransaction(id, updatedData) {
        const data = this.getData();
        const index = data.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            data.transactions[index] = { ...data.transactions[index], ...updatedData };
            this.saveData(data);
            return data.transactions[index];
        }
        return null;
    }

    deleteTransaction(id) {
        const data = this.getData();
        data.transactions = data.transactions.filter(t => t.id !== id);
        this.saveData(data);
    }

    getBalance() {
        const transactions = this.getTransactions();
        return transactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
    }

    getTotalByType(type) {
        const transactions = this.getTransactions();
        return transactions
            .filter(t => t.type === type)
            .reduce((acc, t) => acc + t.amount, 0);
    }

    // ===== КАТЕГОРИИ (новый формат) =====
    getCategories() {
        const data = this.getData();
        if (data.categories) {
            return data.categories;
        }
        const result = [];
        if (data.incomeCategories) {
            data.incomeCategories.forEach(cat => {
                result.push({
                    id: cat.id,
                    name: cat.name,
                    icon: '◻',
                    color: '#3B82F6',
                    type: 'income',
                    parentId: null
                });
                if (cat.subcategories) {
                    cat.subcategories.forEach(sub => {
                        result.push({
                            id: sub.id,
                            name: sub.name,
                            icon: '◻',
                            color: '#3B82F6',
                            type: 'income',
                            parentId: cat.id
                        });
                    });
                }
            });
        }
        if (data.expenseCategories) {
            data.expenseCategories.forEach(cat => {
                result.push({
                    id: cat.id,
                    name: cat.name,
                    icon: '◻',
                    color: '#EF4444',
                    type: 'expense',
                    parentId: null
                });
                if (cat.subcategories) {
                    cat.subcategories.forEach(sub => {
                        result.push({
                            id: sub.id,
                            name: sub.name,
                            icon: '◻',
                            color: '#EF4444',
                            type: 'expense',
                            parentId: cat.id
                        });
                    });
                }
            });
        }
        return result;
    }

    getCategory(id) {
        return this.getCategories().find(c => c.id === id);
    }

    getCategoriesByType(type) {
        return this.getCategories().filter(c => c.type === type);
    }

    getMainCategories(type) {
        return this.getCategories().filter(c => c.type === type && !c.parentId);
    }

    getSubCategories(parentId) {
        return this.getCategories().filter(c => c.parentId === parentId);
    }

    getCategoryTree(type) {
        const mainCategories = this.getMainCategories(type);
        return mainCategories.map(cat => ({
            ...cat,
            children: this.getSubCategories(cat.id)
        }));
    }

    addCategory(category) {
        const data = this.getData();
        category.id = category.id || Date.now().toString();
        category.color = category.color || '#666666';
        if (!data.categories) {
            data.categories = this.getCategories();
        }
        data.categories.push(category);
        this.saveData(data);
        return category;
    }

    updateCategory(id, updatedData) {
        const data = this.getData();
        if (!data.categories) {
            data.categories = this.getCategories();
        }
        const index = data.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            data.categories[index] = { ...data.categories[index], ...updatedData };
            this.saveData(data);
            return data.categories[index];
        }
        return null;
    }

    // ===== ИЗМЕНЕНИЕ №8: ПЕРЕНАЗНАЧЕНИЕ ТРАНЗАКЦИЙ ПРИ УДАЛЕНИИ КАТЕГОРИИ =====
    deleteCategory(id) {
        const data = this.getData();
        if (!data.categories) {
            data.categories = this.getCategories();
        }
        
        // Найти все подкатегории удаляемой категории
        const subCategories = data.categories.filter(c => c.parentId === id);
        const allIds = [id, ...subCategories.map(c => c.id)];
        
        // Проверить, есть ли транзакции у этих категорий
        const hasTransactions = data.transactions.some(t => allIds.includes(t.category));
        
        if (hasTransactions) {
            // Создать категорию "Без категории" если её нет
            let defaultCat = data.categories.find(c => c.id === 'uncategorized');
            if (!defaultCat) {
                defaultCat = {
                    id: 'uncategorized',
                    name: 'Без категории',
                    icon: '◻',
                    color: '#666666',
                    type: 'expense',
                    parentId: null
                };
                data.categories.push(defaultCat);
            }
            
            // Переназначить транзакции на "Без категории"
            data.transactions = data.transactions.map(t => {
                if (allIds.includes(t.category)) {
                    return {
                        ...t,
                        category: 'uncategorized',
                        categoryName: 'Без категории'
                    };
                }
                return t;
            });
        }
        
        // Удалить категории
        data.categories = data.categories.filter(c => !allIds.includes(c.id));
        this.saveData(data);
    }

    getSettings() {
        return this.getData().settings || {};
    }

    updateSettings(settings) {
        const data = this.getData();
        data.settings = { ...data.settings, ...settings };
        this.saveData(data);
    }
}