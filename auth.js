/**
 * FinanceHub Pro - Authentication System
 * Handles login, registration, and session management using localStorage.
 */

class AuthManager {
    constructor() {
        this.USERS_KEY = 'financehub_users';
        this.SESSION_KEY = 'financehub_session';
        this.users = JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
        this.currentUser = JSON.parse(sessionStorage.getItem(this.SESSION_KEY)) || null;

        this.init();
    }

    init() {
        // Handle login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const user = document.getElementById('loginUser').value;
                const pass = document.getElementById('loginPass').value;
                this.login(user, pass);
            });
        }

        // Handle register form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('regName').value;
                const user = document.getElementById('regUser').value;
                const pass = document.getElementById('regPass').value;
                this.register(name, user, pass);
            });
        }
    }

    register(name, username, password) {
        if (this.users.find(u => u.username === username)) {
            this.toast('Este usuário já existe!', 'error');
            return;
        }

        const newUser = {
            id: 'user_' + Date.now(),
            name,
            username,
            password, // In a real app, this would be hashed
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(this.users));
        this.toast('Conta criada com sucesso! Faça login.', 'success');
        
        // Switch back to login form
        setTimeout(() => {
            document.getElementById('toLogin').click();
        }, 1500);
    }

    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = {
                id: user.id,
                name: user.name,
                username: user.username
            };
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentUser));
            this.toast('Login realizado! Redirecionando...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            this.toast('Usuário ou senha incorretos!', 'error');
        }
    }

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'login.html';
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    checkAuthAndRedirect() {
        const path = window.location.pathname;
        const isLoginPage = path.includes('login.html');

        if (!this.isAuthenticated() && !isLoginPage) {
            window.location.href = 'login.html';
        } else if (this.isAuthenticated() && isLoginPage) {
            window.location.href = 'index.html';
        }
    }

    toast(msg, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info'
        };

        toast.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}"></i>
            <span>${msg}</span>
        `;
        
        container.appendChild(toast);
        if (window.lucide) lucide.createIcons({ nodes: [toast] });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Global instance
const auth = new AuthManager();

// Check auth status immediately on script load
auth.checkAuthAndRedirect();
