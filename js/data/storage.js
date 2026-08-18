import { DEFAULT_CATEGORIES } from '../config/constants.js';

export class Storage {
    constructor() {
        this.dbName = 'budgetApp';
        this.initDB();
    }

    initDB() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                transactions: [
                    {
                        id: '1',
                        type: 'income',
                        amount: 50000,
                        category: 'salary_main',
                        categoryName: 'Основная',
                        date: new Date().toISOString().split('T')[0],
                        description: 'Зарплата за январь'
                    },
                    {
                        id: '2',
                        type: 'expense',
                        amount: 3500,
                        category: 'food_home',
                        categoryName: 'Домашняя еда',
                        date: new Date().toISOString().split('T')[0],
                        description: 'Продукты'
                    },
                    {
                        id: '3',
                        type: 'expense',
                        amount: 1200,
                        category: 'transport_bus',
                        categoryName: 'Общественный',
                        date: new Date().toISOString().split('T')[0],
                        description: 'Проездной'
                    },
                    {
                        id: '4',
                        type: 'expense',
                        amount: 2500,
                        category: 'entertainment_movies',
                        categoryName: 'Кино',
                        date: new Date().toISOString().split('T')[0],
                        description: 'Билеты в кино'
                    }
                ],
                categories: DEFAULT_CATEGORIES,
                settings: {
                    currency: 'RUB',
                    theme: 'light'
                }
            };
            localStorage.setItem(this.dbName, JSON.stringify(initialData));
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

    // ===== КАТЕГОРИИ =====
    getCategories() {
        return this.getData().categories || [];
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
        data.categories.push(category);
        this.saveData(data);
        return category;
    }

    updateCategory(id, updatedData) {
        const data = this.getData();
        const index = data.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            data.categories[index] = { ...data.categories[index], ...updatedData };
            this.saveData(data);
            return data.categories[index];
        }
        return null;
    }

    deleteCategory(id) {
        const data = this.getData();
        data.categories = data.categories.filter(c => c.id !== id && c.parentId !== id);
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