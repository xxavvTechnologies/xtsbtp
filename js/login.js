import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const loginBtn = loginForm.querySelector('.login-btn');
const rememberMe = document.getElementById('rememberMe');
const forgotPassword = document.getElementById('forgotPassword');

// Add rate limiting for login attempts
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
let lockoutEnd = 0;

// Check if already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check if user document exists, if not create it
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                email: user.email,
                createdAt: new Date().toISOString(),
                isAdmin: user.email === 'super@xts.admin',
                activePrograms: [],
                completedPrograms: [],
                agreedToTerms: false
            });
        }
        
        window.location.href = 'dashboard.html';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const remainingTime = Math.ceil((lockoutEnd - Date.now()) / 1000 / 60);
        showNotification(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
        return;
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Add loading state
    loginBtn.classList.add('loading');

    try {
        // Set persistence based on remember me checkbox
        const persistence = rememberMe.checked ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect is handled by onAuthStateChanged
    } catch (error) {
        console.error('Login error:', error);
        loginBtn.classList.remove('loading');
        
        // Show error in a more user-friendly way
        const errorMessage = getErrorMessage(error.code);
        showError(errorMessage);
        
        loginAttempts++;
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            lockoutEnd = Date.now() + LOCKOUT_TIME;
        }
        showNotification(getErrorMessage(error.code));
    }
});

forgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    // Implement password reset functionality
    const email = document.getElementById('email').value;
    if (email) {
        // Send password reset email
        sendPasswordResetEmail(auth, email)
            .then(() => {
                alert('Password reset email sent. Please check your inbox.');
            })
            .catch((error) => {
                console.error('Password reset error:', error);
                showError('Error sending password reset email. Please try again.');
            });
    } else {
        showError('Please enter your email address to reset password.');
    }
});

function getErrorMessage(errorCode) {
    const errors = {
        'auth/invalid-login-credentials': {
            title: 'Invalid Login',
            message: 'The email or password you entered is incorrect. Please try again.',
            icon: 'ri-lock-line'
        },
        'auth/user-not-found': {
            title: 'Account Not Found',
            message: 'No account exists with this email address. Please check for typos or sign up.',
            icon: 'ri-mail-line'
        },
        'auth/invalid-email': {
            title: 'Invalid Email',
            message: 'Please enter a valid email address (e.g., user@example.com).',
            icon: 'ri-mail-line'
        },
        'auth/email-already-in-use': {
            title: 'Email In Use',
            message: 'This email is already registered. Please try logging in instead.',
            icon: 'ri-mail-line'
        },
        'auth/weak-password': {
            title: 'Weak Password',
            message: 'Password must be at least 6 characters long.',
            icon: 'ri-lock-line'
        },
        'default': {
            title: 'Error',
            message: 'Something went wrong. Please try again.',
            icon: 'ri-error-warning-line'
        }
    };
    return errors[errorCode] || errors['default'];
}

function showError(error) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    
    const errorInfo = typeof error === 'string' 
        ? { title: 'Error', message: error, icon: 'ri-error-warning-line' }
        : getErrorMessage(error.code);

    notification.innerHTML = `
        <div class="notification-content">
            <i class="${errorInfo.icon}"></i>
            <div class="notification-text">
                <strong>${errorInfo.title}</strong>
                <p>${errorInfo.message}</p>
            </div>
            <button class="notification-close">
                <i class="ri-close-line"></i>
            </button>
        </div>
    `;

    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    document.body.appendChild(notification);

    // Add close button handler
    notification.querySelector('.notification-close').onclick = () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    };

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.isConnected) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification info';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="ri-information-line"></i>
            <div class="notification-text">
                <strong>Notice</strong>
                <p>${message}</p>
            </div>
            <button class="notification-close">
                <i class="ri-close-line"></i>
            </button>
        </div>
    `;

    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    document.body.appendChild(notification);

    // Add close button handler
    notification.querySelector('.notification-close').onclick = () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    };

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.isConnected) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}