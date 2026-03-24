// FinanceHub Pro - Application Logic
// Part 1: Core Data & Utilities

// Dynamic APP_KEY based on user ID
const getAppKey = () => {
    const user = auth.getCurrentUser();
    return user ? `financehub_pro_data_${user.id}` : 'financehub_pro_data';
};

// ===== DEFAULT CATEGORIES =====
const DEFAULT_CATEGORIES = [
    { id: 'cat_1', name: 'Salário', type: 'income', icon: 'dollar', emoji: '💰', color: '#10b981' },
    { id: 'cat_2', name: 'Freelance', type: 'income', icon: 'briefcase', emoji: '💼', color: '#3b82f6' },
    { id: 'cat_3', name: 'Investimentos', type: 'income', icon: 'wallet', emoji: '👛', color: '#8b5cf6' },
    { id: 'cat_4', name: 'Outros', type: 'income', icon: 'gift', emoji: '🎁', color: '#06b6d4' },
    { id: 'cat_5', name: 'Alimentação', type: 'expense', icon: 'utensils', emoji: '🍽️', color: '#ef4444' },
    { id: 'cat_6', name: 'Transporte', type: 'expense', icon: 'car', emoji: '🚗', color: '#f59e0b' },
    { id: 'cat_7', name: 'Moradia', type: 'expense', icon: 'home', emoji: '🏠', color: '#ec4899' },
    { id: 'cat_8', name: 'Saúde', type: 'expense', icon: 'stethoscope', emoji: '🏥', color: '#10b981' },
    { id: 'cat_9', name: 'Educação', type: 'expense', icon: 'book', emoji: '📚', color: '#3b82f6' },
    { id: 'cat_10', name: 'Lazer', type: 'expense', icon: 'gamepad', emoji: '🎮', color: '#8b5cf6' },
    { id: 'cat_11', name: 'Compras', type: 'expense', icon: 'shopping-cart', emoji: '🛒', color: '#06b6d4' },
    { id: 'cat_12', name: 'Contas', type: 'expense', icon: 'zap', emoji: '⚡', color: '#f59e0b' },
    { id: 'cat_13', name: 'Assinaturas', type: 'expense', icon: 'wifi', emoji: '📡', color: '#64748b' },
    { id: 'cat_14', name: 'Pet', type: 'expense', icon: 'dog', emoji: '🐕', color: '#ec4899' },
    { id: 'cat_15', name: 'Vestuário', type: 'expense', icon: 'shirt', emoji: '👕', color: '#8b5cf6' },
];

const ICON_MAP = {
    'shopping-cart':'🛒','home':'🏠','car':'🚗','utensils':'🍽️','heart':'❤️','book':'📚',
    'plane':'✈️','briefcase':'💼','gamepad':'🎮','gift':'🎁','music':'🎵','dumbbell':'💪',
    'stethoscope':'🏥','dog':'🐕','shirt':'👕','dollar':'💰','wallet':'👛','phone':'📱',
    'wifi':'📡','zap':'⚡'
};

const BANK_TYPES = { checking:'Conta Corrente', savings:'Poupança', investment:'Investimento', digital:'Conta Digital' };
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ===== STATE =====
let state = { transactions:[], accounts:[], cards:[], cardTransactions:[], categories:[], goals:[], caixinhas:[], recurrences:[], currentMonth: new Date().getMonth(), currentYear: new Date().getFullYear() };
let selectedCardId = null;
let selectedBankIdForCaixinhas = null;
let deleteCallback = null;
let chartInstances = {};

// ===== UTILITIES =====
const uid = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const fmt = (v) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const parseVal = (s) => { if(typeof s==='number') return s; return parseFloat(String(s).replace(/[^\d,.-]/g,'').replace(',','.')) || 0; };
const fmtDate = (d) => { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };

function save() { 
    localStorage.setItem(getAppKey(), JSON.stringify(state)); 
}
function load() {
    const d = localStorage.getItem(getAppKey());
    if (d) { 
        state = JSON.parse(d); 
    } else {
        // Fresh state for new user
        state = { transactions:[], accounts:[], cards:[], cardTransactions:[], categories:[], goals:[], caixinhas:[], recurrences:[], currentMonth: new Date().getMonth(), currentYear: new Date().getFullYear() };
    }
    if (!state.categories || state.categories.length === 0) state.categories = [...DEFAULT_CATEGORIES];
    if (!state.caixinhas) state.caixinhas = [];
    if (!state.recurrences) state.recurrences = [];
    if (!state.currentMonth) { state.currentMonth = new Date().getMonth(); state.currentYear = new Date().getFullYear(); }
}

function toast(msg, type='success') {
    const c = document.getElementById('toastContainer');
    const icons = { success:'check-circle', error:'alert-circle', info:'info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i data-lucide="${icons[type]}"></i><span>${msg}</span>`;
    c.appendChild(t);
    lucide.createIcons({ nodes: [t] });
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function getCat(id) { return state.categories.find(c => c.id === id) || { name:'Sem categoria', emoji:'📋', color:'#64748b' }; }
function getAcc(id) { return state.accounts.find(a => a.id === id) || { name:'Sem conta' }; }

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Basic auth check already done in auth.js, but let's ensure UI reflects user
    const user = auth.getCurrentUser();
    if (user) {
        const nameEl = document.getElementById('userNameDisplay');
        const avatarEl = document.getElementById('userAvatar');
        const logoutBtn = document.getElementById('btnLogout');
        
        if (nameEl) nameEl.textContent = user.name;
        if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
        if (logoutBtn) logoutBtn.addEventListener('click', () => auth.logout());
    }

    load();
    initNavigation();
    initModals();
    initForms();
    initMonthSelector();
    initExportImport();
    processRecurrences();
    renderAll();
    lucide.createIcons();
});

// ===== NAVIGATION =====
function initNavigation() {
    document.querySelectorAll('.nav-item, .btn-link[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`)?.classList.add('active');
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
            if (section === 'reports') setTimeout(renderReports, 100);
        });
    });

    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });
}

// ===== MODALS =====
function initModals() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
    });
    // Color pickers
    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                picker.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                const hidden = picker.parentElement.querySelector('input[type="hidden"]');
                if (hidden) hidden.value = opt.dataset.color;
            });
        });
    });
    // Icon picker
    document.getElementById('iconPicker')?.querySelectorAll('.icon-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('#iconPicker .icon-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            document.getElementById('categoryIcon').value = opt.dataset.icon;
        });
    });
}

// ===== MONTH SELECTOR =====
function initMonthSelector() {
    updateMonthLabel();
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        state.currentMonth--; if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
        updateMonthLabel(); renderAll();
    });
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        state.currentMonth++; if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
        updateMonthLabel(); renderAll();
    });
}
function updateMonthLabel() {
    document.getElementById('currentMonthLabel').textContent = `${MONTHS_PT[state.currentMonth]} ${state.currentYear}`;
    const mi = document.getElementById('filterMonth');
    if (mi) mi.value = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}`;
}

// ===== EXPORT / IMPORT =====
function initExportImport() {
    document.getElementById('btnExportData')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `financehub_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
        toast('Dados exportados com sucesso!');
    });
    document.getElementById('btnImportData')?.addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try { state = JSON.parse(ev.target.result); save(); renderAll(); toast('Dados importados!'); }
            catch { toast('Erro ao importar arquivo', 'error'); }
        };
        reader.readAsText(file); e.target.value = '';
    });
}

// ===== RENDER ALL =====
function renderAll() {
    renderDashboard();
    renderCashflow();
    renderBanks();
    renderCards();
    renderCategories();
    renderGoals();
    renderRecurrences();
    populateSelects();
    lucide.createIcons();
}

// ===== POPULATE SELECTS =====
function populateSelects() {
    const type = document.getElementById('transactionType')?.value || 'income';
    const cats = state.categories.filter(c => c.type === type);
    const selCat = document.getElementById('transactionCategory');
    if (selCat) { selCat.innerHTML = '<option value="">Selecione...</option>' + cats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join(''); }
    const selAcc = document.getElementById('transactionAccount');
    if (selAcc) { selAcc.innerHTML = '<option value="">Selecione...</option>' + state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join(''); }
    const fCat = document.getElementById('filterCategory');
    if (fCat) { fCat.innerHTML = '<option value="all">Todas Categorias</option>' + state.categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join(''); }
    const ctCat = document.getElementById('cardTransCategory');
    if (ctCat) { const exCats = state.categories.filter(c => c.type === 'expense'); ctCat.innerHTML = '<option value="">Selecione...</option>' + exCats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join(''); }
    // Transfer selects
    const tf = document.getElementById('transferFrom');
    const tt = document.getElementById('transferTo');
    if (tf) tf.innerHTML = state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    if (tt) tt.innerHTML = state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    // Recurrence selects
    const recType = document.getElementById('recurrenceType')?.value || 'expense';
    const recCats = state.categories.filter(c => c.type === recType);
    const rcCat = document.getElementById('recurrenceCategory');
    if (rcCat) rcCat.innerHTML = '<option value="">Selecione...</option>' + recCats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
    const rcAcc = document.getElementById('recurrenceAccount');
    if (rcAcc) rcAcc.innerHTML = '<option value="">Selecione...</option>' + state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

// ===== INIT FORMS =====
function initForms() {
    // Transaction toggle
    const toggleIncome = document.getElementById('toggleIncome');
    const toggleExpense = document.getElementById('toggleExpense');
    toggleIncome?.addEventListener('click', () => { toggleIncome.classList.add('active'); toggleExpense.classList.remove('active'); document.getElementById('transactionType').value = 'income'; populateSelects(); });
    toggleExpense?.addEventListener('click', () => { toggleExpense.classList.add('active'); toggleIncome.classList.remove('active'); document.getElementById('transactionType').value = 'expense'; populateSelects(); });

    // Open modals
    const openTrans = () => { document.getElementById('formTransaction').reset(); document.getElementById('transactionId').value = ''; document.getElementById('transactionDate').value = new Date().toISOString().slice(0,10); document.getElementById('modalTransactionTitle').textContent = 'Nova Transação'; toggleIncome.classList.add('active'); toggleExpense.classList.remove('active'); document.getElementById('transactionType').value = 'income'; populateSelects(); openModal('modalTransaction'); };
    document.getElementById('btnAddTransaction')?.addEventListener('click', openTrans);
    document.getElementById('btnAddTransactionEmpty')?.addEventListener('click', openTrans);

    const openBank = () => { document.getElementById('formBank').reset(); document.getElementById('bankId').value = ''; document.getElementById('modalBankTitle').textContent = 'Nova Conta Bancária'; document.getElementById('bankColor').value = '#8b5cf6'; openModal('modalBank'); };
    document.getElementById('btnAddBank')?.addEventListener('click', openBank);
    document.getElementById('btnAddBankEmpty')?.addEventListener('click', openBank);

    const openCard = () => { document.getElementById('formCard').reset(); document.getElementById('cardId').value = ''; document.getElementById('modalCardTitle').textContent = 'Novo Cartão de Crédito'; document.getElementById('cardColor').value = '#8b5cf6'; openModal('modalCard'); };
    document.getElementById('btnAddCard')?.addEventListener('click', openCard);
    document.getElementById('btnAddCardEmpty')?.addEventListener('click', openCard);

    document.getElementById('btnAddCardTransaction')?.addEventListener('click', () => { document.getElementById('formCardTransaction').reset(); document.getElementById('cardTransactionId').value = ''; document.getElementById('cardTransactionCardId').value = selectedCardId; document.getElementById('cardTransDate').value = new Date().toISOString().slice(0,10); populateSelects(); openModal('modalCardTransaction'); });

    const openCat = () => { document.getElementById('formCategory').reset(); document.getElementById('categoryId').value = ''; document.getElementById('modalCategoryTitle').textContent = 'Nova Categoria'; document.getElementById('categoryIcon').value = 'shopping-cart'; document.getElementById('categoryColor').value = '#8b5cf6'; openModal('modalCategory'); };
    document.getElementById('btnAddCategory')?.addEventListener('click', openCat);

    const openGoal = () => { document.getElementById('formGoal').reset(); document.getElementById('goalId').value = ''; document.getElementById('modalGoalTitle').textContent = 'Nova Meta'; document.getElementById('goalColor').value = '#8b5cf6'; openModal('modalGoal'); };
    document.getElementById('btnAddGoal')?.addEventListener('click', openGoal);
    document.getElementById('btnAddGoalEmpty')?.addEventListener('click', openGoal);

    // Recurrence open
    const openRec = () => { document.getElementById('formRecurrence').reset(); document.getElementById('recurrenceId').value = ''; document.getElementById('recurrenceType').value = 'expense'; document.getElementById('modalRecurrenceTitle').textContent = 'Nova Recorrência'; document.getElementById('toggleRecExpense').classList.add('active'); document.getElementById('toggleRecIncome').classList.remove('active'); populateSelects(); openModal('modalRecurrence'); };
    document.getElementById('btnAddRecurrence')?.addEventListener('click', openRec);
    document.getElementById('btnAddRecurrenceEmpty')?.addEventListener('click', openRec);

    // Recurrence type toggles
    document.getElementById('toggleRecIncome')?.addEventListener('click', () => { document.getElementById('toggleRecIncome').classList.add('active'); document.getElementById('toggleRecExpense').classList.remove('active'); document.getElementById('recurrenceType').value = 'income'; populateSelects(); });
    document.getElementById('toggleRecExpense')?.addEventListener('click', () => { document.getElementById('toggleRecExpense').classList.add('active'); document.getElementById('toggleRecIncome').classList.remove('active'); document.getElementById('recurrenceType').value = 'expense'; populateSelects(); });

    // Confirm delete
    document.getElementById('btnConfirmDelete')?.addEventListener('click', () => { if (deleteCallback) deleteCallback(); closeModal('modalConfirm'); });

    // Transfer
    document.getElementById('btnTransfer')?.addEventListener('click', () => {
        const from = document.getElementById('transferFrom').value;
        const to = document.getElementById('transferTo').value;
        const amount = parseVal(document.getElementById('transferAmount').value);
        const date = document.getElementById('transferDate').value || new Date().toISOString().slice(0,10);
        if (!from || !to || from === to || amount <= 0) { toast('Preencha os dados corretamente', 'error'); return; }
        const accFrom = state.accounts.find(a => a.id === from);
        const accTo = state.accounts.find(a => a.id === to);
        if (accFrom) accFrom.balance -= amount;
        if (accTo) accTo.balance += amount;
        state.transactions.push({ id: uid(), type:'expense', description:`Transferência → ${accTo?.name}`, amount, date, categoryId:'', accountId:from, notes:'Transferência entre contas' });
        state.transactions.push({ id: uid(), type:'income', description:`Transferência ← ${accFrom?.name}`, amount, date, categoryId:'', accountId:to, notes:'Transferência entre contas' });
        save(); renderAll(); toast('Transferência realizada!');
        document.getElementById('transferAmount').value = '';
    });

    // Form submissions
    document.getElementById('formTransaction')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('transactionId').value;
        const data = { id: id || uid(), type: document.getElementById('transactionType').value, description: document.getElementById('transactionDescription').value, amount: parseVal(document.getElementById('transactionAmount').value), date: document.getElementById('transactionDate').value, categoryId: document.getElementById('transactionCategory').value, accountId: document.getElementById('transactionAccount').value, notes: document.getElementById('transactionNotes').value };
        if (id) { const idx = state.transactions.findIndex(t => t.id === id); if (idx >= 0) state.transactions[idx] = data; }
        else {
            state.transactions.push(data);
            const acc = state.accounts.find(a => a.id === data.accountId);
            if (acc) { acc.balance += data.type === 'income' ? data.amount : -data.amount; }
        }
        save(); closeModal('modalTransaction'); renderAll(); toast(id ? 'Transação atualizada!' : 'Transação adicionada!');
    });

    document.getElementById('formBank')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('bankId').value;
        const data = { id: id || uid(), name: document.getElementById('bankName').value, type: document.getElementById('bankType').value, balance: parseVal(document.getElementById('bankBalance').value), color: document.getElementById('bankColor').value };
        if (id) { const idx = state.accounts.findIndex(a => a.id === id); if (idx >= 0) state.accounts[idx] = data; }
        else state.accounts.push(data);
        save(); closeModal('modalBank'); renderAll(); toast(id ? 'Conta atualizada!' : 'Conta adicionada!');
    });

    document.getElementById('formCard')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('cardId').value;
        const data = { id: id || uid(), name: document.getElementById('cardName').value, limit: parseVal(document.getElementById('cardLimit').value), closingDay: parseInt(document.getElementById('cardClosingDay').value), dueDay: parseInt(document.getElementById('cardDueDay').value), brand: document.getElementById('cardBrand').value, color: document.getElementById('cardColor').value };
        if (id) { const idx = state.cards.findIndex(c => c.id === id); if (idx >= 0) state.cards[idx] = data; }
        else state.cards.push(data);
        save(); closeModal('modalCard'); renderAll(); toast(id ? 'Cartão atualizado!' : 'Cartão adicionado!');
    });

    document.getElementById('formCardTransaction')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('cardTransactionId').value;
        const data = { id: id || uid(), cardId: document.getElementById('cardTransactionCardId').value || selectedCardId, description: document.getElementById('cardTransDescription').value, amount: parseVal(document.getElementById('cardTransAmount').value), date: document.getElementById('cardTransDate').value, categoryId: document.getElementById('cardTransCategory').value, installments: parseInt(document.getElementById('cardTransInstallments').value) || 1 };
        if (id) { const idx = state.cardTransactions.findIndex(t => t.id === id); if (idx >= 0) state.cardTransactions[idx] = data; }
        else state.cardTransactions.push(data);
        save(); closeModal('modalCardTransaction'); renderAll(); toast(id ? 'Lançamento atualizado!' : 'Lançamento adicionado!');
    });

    document.getElementById('formCategory')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const icon = document.getElementById('categoryIcon').value;
        const data = { id: id || uid(), name: document.getElementById('categoryName').value, type: document.getElementById('categoryType').value, icon, emoji: ICON_MAP[icon] || '📋', color: document.getElementById('categoryColor').value };
        if (id) { const idx = state.categories.findIndex(c => c.id === id); if (idx >= 0) state.categories[idx] = data; }
        else state.categories.push(data);
        save(); closeModal('modalCategory'); renderAll(); toast(id ? 'Categoria atualizada!' : 'Categoria adicionada!');
    });

    document.getElementById('formGoal')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('goalId').value;
        const data = { id: id || uid(), name: document.getElementById('goalName').value, target: parseVal(document.getElementById('goalTarget').value), current: parseVal(document.getElementById('goalCurrent').value), deadline: document.getElementById('goalDeadline').value, color: document.getElementById('goalColor').value };
        if (id) { const idx = state.goals.findIndex(g => g.id === id); if (idx >= 0) state.goals[idx] = data; }
        else state.goals.push(data);
        save(); closeModal('modalGoal'); renderAll(); toast(id ? 'Meta atualizada!' : 'Meta criada!');
    });

    // Recurrence form
    document.getElementById('formRecurrence')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('recurrenceId').value;
        const data = { id: id || uid(), description: document.getElementById('recurrenceDescription').value, amount: parseVal(document.getElementById('recurrenceAmount').value), type: document.getElementById('recurrenceType').value, categoryId: document.getElementById('recurrenceCategory').value, accountId: document.getElementById('recurrenceAccount').value, dayOfMonth: parseInt(document.getElementById('recurrenceDayOfMonth').value) || 1, notes: document.getElementById('recurrenceNotes').value, active: true, createdAt: id ? (state.recurrences.find(r => r.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString() };
        if (id) {
            const existing = state.recurrences.find(r => r.id === id);
            if (existing) data.active = existing.active;
            const idx = state.recurrences.findIndex(r => r.id === id); if (idx >= 0) state.recurrences[idx] = data;
        } else {
            state.recurrences.push(data);
        }
        save(); closeModal('modalRecurrence'); processRecurrences(); renderAll(); toast(id ? 'Recorrência atualizada!' : 'Recorrência adicionada!');
    });

    // Filters
    document.getElementById('filterType')?.addEventListener('change', renderCashflow);
    document.getElementById('filterCategory')?.addEventListener('change', renderCashflow);
    document.getElementById('filterMonth')?.addEventListener('change', (e) => {
        const [y, m] = e.target.value.split('-'); state.currentYear = parseInt(y); state.currentMonth = parseInt(m) - 1;
        updateMonthLabel(); renderAll();
    });
    document.getElementById('reportPeriod')?.addEventListener('change', () => setTimeout(renderReports, 100));
}

// ===== HELPER: Confirm Delete =====
function confirmDelete(msg, cb) { document.getElementById('confirmMessage').textContent = msg; deleteCallback = cb; openModal('modalConfirm'); }

// ===== FILTER TRANSACTIONS BY MONTH =====
function getMonthTransactions() {
    return state.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === state.currentMonth && d.getFullYear() === state.currentYear; });
}

// ===== DASHBOARD =====
function renderDashboard() {
    const txs = getMonthTransactions();
    const totalBal = state.accounts.reduce((s, a) => s + a.balance, 0);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const cardBill = state.cardTransactions.reduce((s, t) => s + t.amount, 0);

    document.getElementById('totalBalance').textContent = fmt(totalBal);
    document.getElementById('totalBalance').className = `card-value ${totalBal >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('totalIncome').textContent = fmt(income);
    document.getElementById('totalExpense').textContent = fmt(expense);
    document.getElementById('totalCardBill').textContent = fmt(cardBill);

    // Recent transactions
    const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const container = document.getElementById('recentTransactions');
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state"><i data-lucide="inbox"></i><p>Nenhuma transação registrada</p></div>';
    } else {
        container.innerHTML = recent.map(t => {
            const cat = getCat(t.categoryId);
            return `<div class="transaction-item"><div class="transaction-icon" style="background:${cat.color}20">${cat.emoji}</div><div class="transaction-info"><div class="transaction-desc">${t.description}</div><div class="transaction-meta">${fmtDate(t.date)} • ${cat.name}</div></div><span class="transaction-amount ${t.type === 'income' ? 'positive' : 'negative'}">${t.type === 'income' ? '+' : '-'} ${fmt(t.amount)}</span></div>`;
        }).join('');
    }

    // Charts
    renderDashboardCharts(txs);
}

function renderDashboardCharts(txs) {
    const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } } };
    // Income vs Expense bar
    if (chartInstances.incExp) chartInstances.incExp.destroy();
    const ctx1 = document.getElementById('chartIncomeExpense');
    if (ctx1) {
        const labels = []; const incData = []; const expData = [];
        for (let i = 5; i >= 0; i--) {
            let m = state.currentMonth - i; let y = state.currentYear;
            if (m < 0) { m += 12; y--; }
            labels.push(MONTHS_PT[m].slice(0, 3));
            const mt = state.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; });
            incData.push(mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
            expData.push(mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
        }
        chartInstances.incExp = new Chart(ctx1, { type: 'bar', data: { labels, datasets: [{ label: 'Receitas', data: incData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }, { label: 'Despesas', data: expData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 }] }, options: { ...chartOpts, scales: { x: { ticks: { color: '#64748b' }, grid: { display: false } }, y: { ticks: { color: '#64748b', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } } } } });
    }
    // Category pie
    if (chartInstances.catPie) chartInstances.catPie.destroy();
    const ctx2 = document.getElementById('chartCategoryPie');
    if (ctx2) {
        const expByCategory = {};
        txs.filter(t => t.type === 'expense').forEach(t => { const cat = getCat(t.categoryId); expByCategory[cat.name] = (expByCategory[cat.name] || { total: 0, color: cat.color }); expByCategory[cat.name].total += t.amount; });
        const entries = Object.entries(expByCategory).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
        if (entries.length > 0) {
            chartInstances.catPie = new Chart(ctx2, { type: 'doughnut', data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1].total), backgroundColor: entries.map(e => e[1].color), borderWidth: 0 }] }, options: { ...chartOpts, cutout: '65%', plugins: { ...chartOpts.plugins, legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 12 } } } } });
        }
    }
}

// ===== CASHFLOW =====
function renderCashflow() {
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterCat = document.getElementById('filterCategory')?.value || 'all';
    let txs = getMonthTransactions();
    if (filterType !== 'all') txs = txs.filter(t => t.type === filterType);
    if (filterCat !== 'all') txs = txs.filter(t => t.categoryId === filterCat);
    txs.sort((a, b) => new Date(b.date) - new Date(a.date));

    const allMonth = getMonthTransactions();
    const income = allMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = allMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('cfIncome').textContent = fmt(income);
    document.getElementById('cfExpense').textContent = fmt(expense);
    const bal = income - expense;
    const cfBal = document.getElementById('cfBalance');
    cfBal.textContent = fmt(bal);
    cfBal.className = `cf-value ${bal >= 0 ? 'positive' : 'negative'}`;

    const tbody = document.getElementById('transactionsBody');
    const empty = document.getElementById('emptyTransactions');
    if (txs.length === 0) { tbody.innerHTML = ''; empty.style.display = 'flex'; document.getElementById('transactionsTable').style.display = 'none'; return; }
    empty.style.display = 'none'; document.getElementById('transactionsTable').style.display = 'table';
    tbody.innerHTML = txs.map(t => {
        const cat = getCat(t.categoryId);
        const acc = getAcc(t.accountId);
        return `<tr><td>${fmtDate(t.date)}</td><td>${t.description}${t.recurrenceId ? ' <span class="rec-badge" title="Recorrência">🔄</span>' : ''}</td><td><span class="category-badge" style="background:${cat.color}20;color:${cat.color}">${cat.emoji} ${cat.name}</span></td><td>${acc.name}</td><td class="${t.type === 'income' ? 'positive' : 'negative'}" style="font-weight:600">${t.type === 'income' ? '+' : '-'} ${fmt(t.amount)}</td><td class="actions"><button class="action-btn" onclick="editTransaction('${t.id}')" title="Editar"><i data-lucide="pencil"></i></button><button class="action-btn delete" onclick="deleteTransaction('${t.id}')" title="Excluir"><i data-lucide="trash-2"></i></button></td></tr>`;
    }).join('');
    lucide.createIcons();
}

function editTransaction(id) {
    const t = state.transactions.find(x => x.id === id); if (!t) return;
    document.getElementById('transactionId').value = t.id;
    document.getElementById('transactionDescription').value = t.description;
    document.getElementById('transactionAmount').value = t.amount;
    document.getElementById('transactionDate').value = t.date;
    document.getElementById('transactionType').value = t.type;
    document.getElementById('transactionNotes').value = t.notes || '';
    document.getElementById('modalTransactionTitle').textContent = 'Editar Transação';
    const ti = document.getElementById('toggleIncome'); const te = document.getElementById('toggleExpense');
    if (t.type === 'income') { ti.classList.add('active'); te.classList.remove('active'); } else { te.classList.add('active'); ti.classList.remove('active'); }
    populateSelects();
    document.getElementById('transactionCategory').value = t.categoryId;
    document.getElementById('transactionAccount').value = t.accountId;
    openModal('modalTransaction');
}

function deleteTransaction(id) {
    confirmDelete('Tem certeza que deseja excluir esta transação?', () => {
        const t = state.transactions.find(x => x.id === id);
        if (t) { const acc = state.accounts.find(a => a.id === t.accountId); if (acc) acc.balance += t.type === 'income' ? -t.amount : t.amount; }
        state.transactions = state.transactions.filter(x => x.id !== id);
        save(); renderAll(); toast('Transação excluída!');
    });
}

// ===== BANKS =====
function renderBanks() {
    const grid = document.getElementById('bankCardsGrid');
    const empty = document.getElementById('emptyBanks');
    const transferPanel = document.getElementById('transferPanel');
    if (state.accounts.length === 0) { grid.innerHTML = ''; grid.appendChild(empty); empty.style.display = 'flex'; if (transferPanel) transferPanel.style.display = 'none'; return; }
    empty.style.display = 'none';
    if (transferPanel && state.accounts.length >= 2) transferPanel.style.display = 'block';
    grid.innerHTML = state.accounts.map(a => `
        <div class="bank-card" style="--bank-color:${a.color}">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${a.color}"></div>
            <div class="bank-card-header">
                <span class="bank-card-name">${a.name}</span>
                <span class="bank-card-type">${BANK_TYPES[a.type] || a.type}</span>
            </div>
            <span class="bank-card-label">Saldo Disponível</span>
            <div class="bank-card-balance ${a.balance >= 0 ? 'positive' : 'negative'}">${fmt(a.balance)}</div>
            <div class="bank-card-actions">
                <button class="btn-icon" onclick="editBank('${a.id}')" title="Editar"><i data-lucide="pencil"></i></button>
                <button class="btn-icon" onclick="deleteBank('${a.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
    `).join('');
    document.getElementById('transferDate').value = new Date().toISOString().slice(0,10);
    lucide.createIcons();
}

function editBank(id) {
    const a = state.accounts.find(x => x.id === id); if (!a) return;
    document.getElementById('bankId').value = a.id;
    document.getElementById('bankName').value = a.name;
    document.getElementById('bankType').value = a.type;
    document.getElementById('bankBalance').value = a.balance;
    document.getElementById('bankColor').value = a.color;
    document.getElementById('modalBankTitle').textContent = 'Editar Conta';
    openModal('modalBank');
}

function deleteBank(id) {
    confirmDelete('Excluir esta conta bancária?', () => {
        state.accounts = state.accounts.filter(a => a.id !== id);
        save(); renderAll(); toast('Conta excluída!');
    });
}

// ===== CARDS =====
function renderCards() {
    const grid = document.getElementById('creditCardsGrid');
    const empty = document.getElementById('emptyCards');
    if (state.cards.length === 0) { grid.innerHTML = ''; grid.appendChild(empty); empty.style.display = 'flex'; document.getElementById('cardTransactionsPanel').style.display = 'none'; return; }
    empty.style.display = 'none';
    grid.innerHTML = state.cards.map(c => {
        const used = state.cardTransactions.filter(t => t.cardId === c.id).reduce((s, t) => s + t.amount, 0);
        const pct = c.limit > 0 ? Math.min((used / c.limit) * 100, 100) : 0;
        const avail = c.limit - used;
        return `<div class="credit-card-visual ${selectedCardId === c.id ? 'selected' : ''}" style="background:linear-gradient(135deg, ${c.color}, ${c.color}99)" onclick="selectCard('${c.id}')">
            <div class="cc-actions"><button class="action-btn" onclick="event.stopPropagation();editCard('${c.id}')" title="Editar"><i data-lucide="pencil"></i></button><button class="action-btn" onclick="event.stopPropagation();deleteCard('${c.id}')" title="Excluir"><i data-lucide="trash-2"></i></button></div>
            <div class="cc-header"><span class="cc-name">${c.name}</span><span class="cc-brand">${c.brand}</span></div>
            <div class="cc-footer"><div class="cc-limit-bar"><div class="cc-limit-fill" style="width:${pct}%"></div></div>
            <div class="cc-details"><div><span>Fatura Atual</span><strong>${fmt(used)}</strong></div><div><span>Disponível</span><strong>${fmt(avail)}</strong></div></div></div>
        </div>`;
    }).join('');
    if (selectedCardId) renderCardTransactions();
    lucide.createIcons();
}

function selectCard(id) {
    selectedCardId = id;
    renderCards();
    document.getElementById('cardTransactionsPanel').style.display = 'block';
    renderCardTransactions();
}

function renderCardTransactions() {
    if (!selectedCardId) return;
    const card = state.cards.find(c => c.id === selectedCardId); if (!card) return;
    document.getElementById('selectedCardName').textContent = card.name;
    const txs = state.cardTransactions.filter(t => t.cardId === selectedCardId).sort((a, b) => new Date(b.date) - new Date(a.date));
    const used = txs.reduce((s, t) => s + t.amount, 0);
    document.getElementById('currentBill').textContent = fmt(used);
    document.getElementById('availableLimit').textContent = fmt(card.limit - used);
    const tbody = document.getElementById('cardTransactionsBody');
    tbody.innerHTML = txs.map(t => {
        const cat = getCat(t.categoryId);
        return `<tr><td>${fmtDate(t.date)}</td><td>${t.description}</td><td><span class="category-badge" style="background:${cat.color}20;color:${cat.color}">${cat.emoji} ${cat.name}</span></td><td>${t.installments > 1 ? t.installments + 'x' : '1x'}</td><td class="negative" style="font-weight:600">${fmt(t.amount)}</td><td class="actions"><button class="action-btn" onclick="editCardTrans('${t.id}')" title="Editar"><i data-lucide="pencil"></i></button><button class="action-btn delete" onclick="deleteCardTrans('${t.id}')" title="Excluir"><i data-lucide="trash-2"></i></button></td></tr>`;
    }).join('');
    lucide.createIcons();
}

function editCard(id) {
    const c = state.cards.find(x => x.id === id); if (!c) return;
    document.getElementById('cardId').value = c.id;
    document.getElementById('cardName').value = c.name;
    document.getElementById('cardLimit').value = c.limit;
    document.getElementById('cardClosingDay').value = c.closingDay;
    document.getElementById('cardDueDay').value = c.dueDay;
    document.getElementById('cardBrand').value = c.brand;
    document.getElementById('cardColor').value = c.color;
    document.getElementById('modalCardTitle').textContent = 'Editar Cartão';
    openModal('modalCard');
}

function deleteCard(id) {
    confirmDelete('Excluir este cartão e todos os lançamentos?', () => {
        state.cards = state.cards.filter(c => c.id !== id);
        state.cardTransactions = state.cardTransactions.filter(t => t.cardId !== id);
        if (selectedCardId === id) { selectedCardId = null; document.getElementById('cardTransactionsPanel').style.display = 'none'; }
        save(); renderAll(); toast('Cartão excluído!');
    });
}

function editCardTrans(id) {
    const t = state.cardTransactions.find(x => x.id === id); if (!t) return;
    document.getElementById('cardTransactionId').value = t.id;
    document.getElementById('cardTransactionCardId').value = t.cardId;
    document.getElementById('cardTransDescription').value = t.description;
    document.getElementById('cardTransAmount').value = t.amount;
    document.getElementById('cardTransDate').value = t.date;
    document.getElementById('cardTransInstallments').value = t.installments;
    populateSelects();
    document.getElementById('cardTransCategory').value = t.categoryId;
    openModal('modalCardTransaction');
}

function deleteCardTrans(id) {
    confirmDelete('Excluir este lançamento?', () => {
        state.cardTransactions = state.cardTransactions.filter(t => t.id !== id);
        save(); renderAll(); toast('Lançamento excluído!');
    });
}

// ===== CATEGORIES =====
function renderCategories() {
    const incList = document.getElementById('incomeCategoriesList');
    const expList = document.getElementById('expenseCategoriesList');
    const incCats = state.categories.filter(c => c.type === 'income');
    const expCats = state.categories.filter(c => c.type === 'expense');

    incList.innerHTML = incCats.length ? incCats.map(c => `
        <div class="category-item">
            <div class="category-icon" style="background:${c.color}20">${c.emoji}</div>
            <span class="category-name">${c.name}</span>
            <div class="category-actions">
                <button class="action-btn" onclick="editCategory('${c.id}')" title="Editar"><i data-lucide="pencil"></i></button>
                <button class="action-btn delete" onclick="deleteCategory('${c.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
    `).join('') : '<p style="color:var(--text-muted);padding:12px">Nenhuma categoria de receita</p>';

    expList.innerHTML = expCats.length ? expCats.map(c => `
        <div class="category-item">
            <div class="category-icon" style="background:${c.color}20">${c.emoji}</div>
            <span class="category-name">${c.name}</span>
            <div class="category-actions">
                <button class="action-btn" onclick="editCategory('${c.id}')" title="Editar"><i data-lucide="pencil"></i></button>
                <button class="action-btn delete" onclick="deleteCategory('${c.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
    `).join('') : '<p style="color:var(--text-muted);padding:12px">Nenhuma categoria de despesa</p>';
    lucide.createIcons();
}

function editCategory(id) {
    const c = state.categories.find(x => x.id === id); if (!c) return;
    document.getElementById('categoryId').value = c.id;
    document.getElementById('categoryName').value = c.name;
    document.getElementById('categoryType').value = c.type;
    document.getElementById('categoryIcon').value = c.icon;
    document.getElementById('categoryColor').value = c.color;
    document.getElementById('modalCategoryTitle').textContent = 'Editar Categoria';
    openModal('modalCategory');
}

function deleteCategory(id) {
    confirmDelete('Excluir esta categoria?', () => {
        state.categories = state.categories.filter(c => c.id !== id);
        save(); renderAll(); toast('Categoria excluída!');
    });
}

// ===== GOALS =====
function renderGoals() {
    const grid = document.getElementById('goalsGrid');
    const empty = document.getElementById('emptyGoals');
    if (state.goals.length === 0) { grid.innerHTML = ''; grid.appendChild(empty); empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    grid.innerHTML = state.goals.map(g => {
        const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
        const deadlineStr = g.deadline ? fmtDate(g.deadline) : 'Sem prazo';
        return `
        <div class="goal-card">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${g.color}"></div>
            <div class="goal-header">
                <span class="goal-name">${g.name}</span>
                <div class="goal-actions">
                    <button class="action-btn" onclick="editGoal('${g.id}')" title="Editar"><i data-lucide="pencil"></i></button>
                    <button class="action-btn delete" onclick="deleteGoal('${g.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
            <div class="goal-percent" style="color:${g.color}">${pct.toFixed(0)}%</div>
            <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%;background:${g.color}"></div></div>
            <div class="goal-values">
                <span>Atual: <strong style="color:${g.color}">${fmt(g.current)}</strong></span>
                <span>Meta: <strong>${fmt(g.target)}</strong></span>
            </div>
            <div class="goal-deadline">📅 Prazo: ${deadlineStr}</div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function editGoal(id) {
    const g = state.goals.find(x => x.id === id); if (!g) return;
    document.getElementById('goalId').value = g.id;
    document.getElementById('goalName').value = g.name;
    document.getElementById('goalTarget').value = g.target;
    document.getElementById('goalCurrent').value = g.current;
    document.getElementById('goalDeadline').value = g.deadline;
    document.getElementById('goalColor').value = g.color;
    document.getElementById('modalGoalTitle').textContent = 'Editar Meta';
    openModal('modalGoal');
}

function deleteGoal(id) {
    confirmDelete('Excluir esta meta?', () => {
        state.goals = state.goals.filter(g => g.id !== id);
        save(); renderAll(); toast('Meta excluída!');
    });
}

// ===== REPORTS =====
function renderReports() {
    const months = parseInt(document.getElementById('reportPeriod')?.value || 6);
    const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } } };

    // Monthly Evolution (line chart)
    if (chartInstances.monthlyEvo) chartInstances.monthlyEvo.destroy();
    const ctx1 = document.getElementById('chartMonthlyEvolution');
    if (ctx1) {
        const labels = []; const incData = []; const expData = []; const balData = [];
        for (let i = months - 1; i >= 0; i--) {
            let m = state.currentMonth - i; let y = state.currentYear;
            while (m < 0) { m += 12; y--; }
            labels.push(`${MONTHS_PT[m].slice(0,3)}/${y}`);
            const mt = state.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; });
            const inc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            incData.push(inc); expData.push(exp); balData.push(inc - exp);
        }
        chartInstances.monthlyEvo = new Chart(ctx1, { type: 'line', data: { labels, datasets: [
            { label: 'Receitas', data: incData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
            { label: 'Despesas', data: expData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
            { label: 'Balanço', data: balData, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.4, borderDash: [5, 5] }
        ]}, options: { ...chartOpts, scales: { x: { ticks: { color: '#64748b' }, grid: { display: false } }, y: { ticks: { color: '#64748b', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } } } } });
    }

    // Report category pie
    if (chartInstances.rptPie) chartInstances.rptPie.destroy();
    const ctx2 = document.getElementById('chartReportCategoryPie');
    if (ctx2) {
        const expByCategory = {};
        state.transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = getCat(t.categoryId);
            expByCategory[cat.name] = (expByCategory[cat.name] || { total: 0, color: cat.color });
            expByCategory[cat.name].total += t.amount;
        });
        const entries = Object.entries(expByCategory).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
        if (entries.length > 0) {
            chartInstances.rptPie = new Chart(ctx2, { type: 'doughnut', data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1].total), backgroundColor: entries.map(e => e[1].color), borderWidth: 0 }] }, options: { ...chartOpts, cutout: '60%', plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 10 } } } } });
        }
    }

    // Top 5 Expenses (horizontal bar)
    if (chartInstances.topExp) chartInstances.topExp.destroy();
    const ctx3 = document.getElementById('chartTopExpenses');
    if (ctx3) {
        const expByCategory = {};
        state.transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = getCat(t.categoryId);
            expByCategory[cat.name] = (expByCategory[cat.name] || { total: 0, color: cat.color });
            expByCategory[cat.name].total += t.amount;
        });
        const entries = Object.entries(expByCategory).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
        if (entries.length > 0) {
            chartInstances.topExp = new Chart(ctx3, { type: 'bar', data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1].total), backgroundColor: entries.map(e => e[1].color), borderRadius: 6 }] }, options: { ...chartOpts, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#94a3b8' }, grid: { display: false } } } } });
        }
    }

    // Comparative bar
    if (chartInstances.compare) chartInstances.compare.destroy();
    const ctx4 = document.getElementById('chartCompare');
    if (ctx4) {
        const labels = []; const incData = []; const expData = [];
        for (let i = months - 1; i >= 0; i--) {
            let m = state.currentMonth - i; let y = state.currentYear;
            while (m < 0) { m += 12; y--; }
            labels.push(`${MONTHS_PT[m].slice(0,3)}`);
            const mt = state.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; });
            incData.push(mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
            expData.push(mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
        }
        chartInstances.compare = new Chart(ctx4, { type: 'bar', data: { labels, datasets: [
            { label: 'Receitas', data: incData, backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 6 },
            { label: 'Despesas', data: expData, backgroundColor: 'rgba(239,68,68,0.8)', borderRadius: 6 }
        ]}, options: { ...chartOpts, scales: { x: { ticks: { color: '#64748b' }, grid: { display: false } }, y: { ticks: { color: '#64748b', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } } } } });
    }
}

// ===== RECURRENCES =====
function processRecurrences() {
    if (!state.recurrences || state.recurrences.length === 0) return;
    const month = state.currentMonth;
    const year = state.currentYear;
    let generated = 0;
    state.recurrences.filter(r => r.active).forEach(r => {
        // Check if transaction already exists for this recurrence in this month
        const exists = state.transactions.some(t => t.recurrenceId === r.id && (() => { const d = new Date(t.date); return d.getMonth() === month && d.getFullYear() === year; })());
        if (!exists) {
            const day = Math.min(r.dayOfMonth, new Date(year, month + 1, 0).getDate());
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const transaction = {
                id: uid(),
                type: r.type,
                description: r.description,
                amount: r.amount,
                date: dateStr,
                categoryId: r.categoryId,
                accountId: r.accountId,
                notes: r.notes ? `🔄 Recorrência • ${r.notes}` : '🔄 Recorrência automática',
                recurrenceId: r.id
            };
            state.transactions.push(transaction);
            // Update account balance
            const acc = state.accounts.find(a => a.id === r.accountId);
            if (acc) { acc.balance += r.type === 'income' ? r.amount : -r.amount; }
            generated++;
        }
    });
    if (generated > 0) {
        save();
        toast(`${generated} transação(ões) recorrente(s) gerada(s)!`, 'info');
    }
}

function renderRecurrences() {
    const grid = document.getElementById('recurrencesGrid');
    const empty = document.getElementById('emptyRecurrences');
    if (!grid) return;

    const active = state.recurrences.filter(r => r.active);
    const paused = state.recurrences.filter(r => !r.active);
    const totalMonthlyRec = active.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

    const rtm = document.getElementById('recTotalMonthly');
    const rac = document.getElementById('recActiveCount');
    const rpc = document.getElementById('recPausedCount');
    
    if (rtm) rtm.textContent = fmt(totalMonthlyRec);
    if (rac) rac.textContent = active.length;
    if (rpc) rpc.textContent = paused.length;

    if (state.recurrences.length === 0) {
        grid.innerHTML = '';
        grid.appendChild(empty);
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';

    grid.innerHTML = state.recurrences.map(r => {
        const cat = getCat(r.categoryId);
        const acc = getAcc(r.accountId);
        const statusClass = r.active ? 'rec-active' : 'rec-paused';
        const statusLabel = r.active ? 'Ativa' : 'Pausada';
        const statusIcon = r.active ? 'check-circle' : 'pause-circle';
        return `
        <div class="recurrence-card ${statusClass}">
            <div class="rec-card-header">
                <div class="rec-card-icon" style="background:${cat.color}20">${cat.emoji}</div>
                <div class="rec-card-info">
                    <span class="rec-card-name">${r.description}</span>
                    <span class="rec-card-meta">${cat.name} • Dia ${r.dayOfMonth} • ${acc.name}</span>
                </div>
                <span class="rec-status-badge ${statusClass}"><i data-lucide="${statusIcon}"></i> ${statusLabel}</span>
            </div>
            <div class="rec-card-amount ${r.type === 'income' ? 'positive' : 'negative'}">${r.type === 'income' ? '+' : '-'} ${fmt(r.amount)}</div>
            <div class="rec-card-footer">
                <span class="rec-card-type">${r.type === 'income' ? '📈 Receita' : '📉 Despesa'} mensal</span>
                <div class="rec-card-actions">
                    <button class="action-btn" onclick="toggleRecurrence('${r.id}')" title="${r.active ? 'Pausar' : 'Ativar'}"><i data-lucide="${r.active ? 'pause' : 'play'}"></i></button>
                    <button class="action-btn" onclick="editRecurrence('${r.id}')" title="Editar"><i data-lucide="pencil"></i></button>
                    <button class="action-btn delete" onclick="deleteRecurrence('${r.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function editRecurrence(id) {
    const r = state.recurrences.find(x => x.id === id); if (!r) return;
    document.getElementById('recurrenceId').value = r.id;
    document.getElementById('recurrenceDescription').value = r.description;
    document.getElementById('recurrenceAmount').value = r.amount;
    document.getElementById('recurrenceDayOfMonth').value = r.dayOfMonth;
    document.getElementById('recurrenceType').value = r.type;
    document.getElementById('recurrenceNotes').value = r.notes || '';
    document.getElementById('modalRecurrenceTitle').textContent = 'Editar Recorrência';
    const ti = document.getElementById('toggleRecIncome'); const te = document.getElementById('toggleRecExpense');
    if (r.type === 'income') { ti.classList.add('active'); te.classList.remove('active'); } else { te.classList.add('active'); ti.classList.remove('active'); }
    populateSelects();
    document.getElementById('recurrenceCategory').value = r.categoryId;
    document.getElementById('recurrenceAccount').value = r.accountId;
    openModal('modalRecurrence');
}

function deleteRecurrence(id) {
    confirmDelete('Excluir esta recorrência? As transações já geradas serão mantidas.', () => {
        state.recurrences = state.recurrences.filter(r => r.id !== id);
        save(); renderAll(); toast('Recorrência excluída!');
    });
}

function toggleRecurrence(id) {
    const r = state.recurrences.find(x => x.id === id); if (!r) return;
    r.active = !r.active;
    save(); renderAll(); toast(r.active ? 'Recorrência ativada!' : 'Recorrência pausada!', 'info');
}

