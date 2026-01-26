const balanceEl = document.getElementById('balance-amount');
const incomeEl = document.getElementById('income-amount');
const expenseEl = document.getElementById('expense-amount');
const list = document.getElementById('transaction-list'); 
const allList = document.getElementById('all-transactions-list');
const form = document.getElementById('transaction-form');
const modal = document.getElementById('modal');
const actionModal = document.getElementById('action-modal');
const addBtn = document.getElementById('add-btn');
const closeBtn = document.getElementById('close-modal');
const emptyState = document.getElementById('empty-state');
const categoryGrid = document.getElementById('category-grid');
const typeInputs = document.querySelectorAll('input[name="type"]');
const selectedCategoryInput = document.getElementById('selected-category');
const actionEditBtn = document.getElementById('action-edit');
const actionDeleteBtn = document.getElementById('action-delete');
const actionCancelBtn = document.getElementById('action-cancel');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentType = 'expense';
let selectedCategory = null;
let editId = null;
let contextId = null;
let expenseChart = null;
let comparisonChart = null;

const categories = {
    expense: [
        { id: 'food', name: 'Food', icon: 'fa-utensils' },
        { id: 'groceries', name: 'Groceries', icon: 'fa-shopping-basket' },
        { id: 'transport', name: 'Travel', icon: 'fa-bus' },
        { id: 'entertainment', name: 'Fun', icon: 'fa-gamepad' },
        { id: 'bills', name: 'Bills', icon: 'fa-file-invoice-dollar' },
        { id: 'health', name: 'Health', icon: 'fa-medkit' },
        { id: 'shopping', name: 'Shopping', icon: 'fa-tshirt' },
        { id: 'other', name: 'Other', icon: 'fa-ellipsis-h' }
    ],
    income: [
        { id: 'salary', name: 'Salary', icon: 'fa-money-bill-wave' },
        { id: 'business', name: 'Business', icon: 'fa-briefcase' },
        { id: 'stocks', name: 'Stocks', icon: 'fa-chart-line' },
        { id: 'bonus', name: 'Bonus', icon: 'fa-gift' },
        { id: 'freelance', name: 'Freelance', icon: 'fa-laptop-code' },
        { id: 'pocket', name: 'Pocket', icon: 'fa-hand-holding-usd' }
    ]
};

function init() {
    const dateDisplay = document.getElementById("date-display");
    if (dateDisplay) {
        setInterval(updateDateTime, 1000);
        updateDateTime();
    }

    if (list) {
        initHome();
    } else if (allList) {
        initAllTransactions();
    }

    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }
}

function initHome() {
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = '';
    transactions.slice(0, 3).forEach(t => addTransactionDOM(t, list));

    updateValues();
    updateChart();
    updateComparisonChart();
    checkEmpty();

    if (addBtn) addBtn.addEventListener('click', () => openModalLogic('add'));
    if (closeBtn) closeBtn.addEventListener('click', closeModalLogic);

    renderCategories();
    setupTypeToggles();
}

function initAllTransactions() {
    filterAndRender();

    document.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            filterAndRender();
        });
    });

    document.getElementById('sort-select').addEventListener('change', filterAndRender);

    if (closeBtn) closeBtn.addEventListener('click', closeModalLogic);
    renderCategories();
    setupTypeToggles();
}
function addTransactionDOM(transaction, targetList) {
    const isIncome = transaction.type === 'income';
    const sign = isIncome ? '+' : '-';
    const item = document.createElement('li');

    const allCats = [...categories.expense, ...categories.income];
    const catObj = allCats.find(c => c.id === transaction.category) || { icon: 'fa-question', name: 'Unknown' };

    item.classList.add('transaction-item');
    item.classList.add(isIncome ? 'income-item' : 'expense-item');
    item.dataset.id = transaction.id;

    const dateObj = new Date(transaction.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    item.innerHTML = `
        <div class="t-left">
            <div class="t-icon">
                <i class="fas ${catObj.icon}"></i>
            </div>
            <div class="t-details">
                <h4>${catObj.name}</h4>
                <small>${transaction.note || ''} • ${dateStr}</small>
            </div>
        </div>
        <div class="t-amount ${isIncome ? 'income-text' : 'expense-text'}">
            ${sign}₹${Math.abs(transaction.amount).toFixed(2)}
        </div>
    `;

    addLongPressListener(item, transaction.id);

    targetList.appendChild(item);
}

function filterAndRender() {
    const filterType = document.querySelector('.chip.active').dataset.filter;
    const sortType = document.getElementById('sort-select').value;

    let filtered = [...transactions];

    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    filtered.sort((a, b) => {
        if (sortType === 'date-new') return new Date(b.date) - new Date(a.date);
        if (sortType === 'date-old') return new Date(a.date) - new Date(b.date);
        if (sortType === 'amt-high') return b.amount - a.amount;
        if (sortType === 'amt-low') return a.amount - b.amount;
    });

    allList.innerHTML = '';
    filtered.forEach(t => addTransactionDOM(t, allList));

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

function addLongPressListener(element, id) {
    let pressTimer;

    const start = () => {
        pressTimer = setTimeout(() => {
            showActionModal(id);
        }, 800);
    };

    const cancel = () => {
        clearTimeout(pressTimer);
    };

    element.addEventListener('touchstart', start);
    element.addEventListener('touchend', cancel);
    element.addEventListener('touchmove', cancel);

    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);
}

function showActionModal(id) {
    contextId = id;
    actionModal.classList.add('active');
}

actionCancelBtn.addEventListener('click', () => actionModal.classList.remove('active'));

actionDeleteBtn.addEventListener('click', () => {
    if (confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== contextId);
        saveAndRefresh();
        actionModal.classList.remove('active');
    }
});

actionEditBtn.addEventListener('click', () => {
    actionModal.classList.remove('active');
    openModalLogic('edit', contextId);
});

function openModalLogic(mode, id = null) {
    modal.classList.add('active');

    if (mode === 'edit' && id) {
        editId = id;
        const t = transactions.find(x => x.id === id);
        if (!t) return;

        document.getElementById('amount').value = t.amount;
        document.getElementById('note').value = t.note || '';
        document.getElementById('date').value = t.date.split('T')[0];

        if (t.type === 'expense') document.getElementById('type-expense').checked = true;
        else document.getElementById('type-income').checked = true;
        currentType = t.type;

        renderCategories();
        selectCategory(t.category);

        document.querySelector('.submit-btn').textContent = "Update Transaction";
    } else {
        editId = null;
        form.reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('type-expense').checked = true;
        currentType = 'expense';
        renderCategories();
        selectCategory(null);
        document.querySelector('.submit-btn').textContent = "Add Transaction";
    }
}

function closeModalLogic() {
    modal.classList.remove('active');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value;
    const dateVal = document.getElementById('date').value;

    if (amount <= 0) return;
    const finalDate = dateVal ? new Date(dateVal) : new Date();

    if (editId) {
        const index = transactions.findIndex(t => t.id === editId);
        if (index !== -1) {
            transactions[index] = {
                ...transactions[index],
                type: currentType,
                amount: amount,
                category: selectedCategory || 'other',
                note: note,
                date: finalDate.toISOString()
            };
        }
    } else {
        const transaction = {
            id: Math.floor(Math.random() * 1000000),
            type: currentType,
            amount: amount,
            category: selectedCategory || 'other',
            note: note,
            date: finalDate.toISOString()
        };
        transactions.push(transaction);
    }

    saveAndRefresh();
    closeModalLogic();
}

function saveAndRefresh() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    window.location.reload();
}

function updateDateTime() {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
    const el = document.getElementById("date-display");
    if (el) el.textContent = formattedDate;
}

function renderCategories() {
    if (!categoryGrid) return;
    categoryGrid.innerHTML = '';
    const currentCats = categories[currentType];

    currentCats.forEach((cat, index) => {
        const div = document.createElement('div');
        div.classList.add('cat-item');

        if (index === 0 && !selectedCategory && !editId) {
            div.classList.add('selected');
            selectedCategory = cat.id;
            selectedCategoryInput.value = cat.id;
        }

        div.innerHTML = `<div class="cat-icon"><i class="fas ${cat.icon}"></i></div><span>${cat.name}</span>`;

        div.addEventListener('click', () => selectCategory(cat.id));
        categoryGrid.appendChild(div);
    });
}

function selectCategory(id) {
    selectedCategory = id;
    selectedCategoryInput.value = id;
    document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('selected'));
    const currentCats = categories[currentType];
    const idx = currentCats.findIndex(c => c.id === id);
    if (idx !== -1 && categoryGrid.children[idx]) {
        categoryGrid.children[idx].classList.add('selected');
    }
}

function setupTypeToggles() {
    typeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            currentType = e.target.value;
            selectedCategory = null;
            renderCategories();
        });
    });
}

function updateValues() {
    if (!balanceEl) return;
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toFixed(2);
    const expense = (transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) * -1).toFixed(2);

    balanceEl.innerText = `₹${total}`;
    incomeEl.innerText = `₹${income}`;
    expenseEl.innerText = `₹${Math.abs(expense)}`;

    const totalSpent = Math.abs(parseFloat(expense));
    const totalIncome = parseFloat(income);
    if (totalIncome > 0) {
        const percent = ((totalSpent / totalIncome) * 100).toFixed(0);
        document.getElementById('chart-percent').innerText = `${percent}%`;
    } else {
        document.getElementById('chart-percent').innerText = totalSpent > 0 ? '100%' : '0%';
    }
}

function updateChart() {
    const ctx = document.getElementById('expense-chart');
    if (!ctx) return;

    const expenseTrans = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    expenseTrans.forEach(t => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount; });

    const labels = Object.keys(categoryTotals).map(k => {
        const cat = categories.expense.find(c => c.id === k);
        return cat ? cat.name : k;
    });
    const bgColors = ['#8CD42E', '#FF4545', '#4585FF', '#FFBD45', '#A045FF', '#45FFBC', '#FF45A0', '#CCCCCC'];

    if (expenseChart) expenseChart.destroy();

    if (Object.keys(categoryTotals).length === 0) {
        expenseChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut', data: { datasets: [{ data: [1], backgroundColor: ['#222'], borderWidth: 0 }] }, options: { cutout: '80%', plugins: { legend: false, tooltip: false } }
        });
        return;
    }

    expenseChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: Object.values(categoryTotals), backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false } } }
    });
}

function updateComparisonChart() {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    const now = new Date();
    const totals = [0, 0, 0];
    const labels = [];
    for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleString('default', { month: 'short' }));
    }

    transactions.forEach(t => {
        if (t.type === 'expense') {
            const tDate = new Date(t.date);
            const diff = (now.getFullYear() - tDate.getFullYear()) * 12 + (now.getMonth() - tDate.getMonth());
            if (diff >= 0 && diff <= 2) totals[2 - diff] += t.amount;
        }
    });

    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses', data: totals, borderColor: '#8CD42E', backgroundColor: 'rgba(140, 212, 46, 0.1)', borderWidth: 2, tension: 0.4, pointBackgroundColor: '#000', pointBorderColor: '#8CD42E', pointRadius: 5, fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
    });
}

function checkEmpty() {
    if (emptyState) {
        emptyState.style.display = transactions.length === 0 ? 'block' : 'none';
    }
}

init();

