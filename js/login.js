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
    switch (errorCode) {
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'An error occurred. Please try again.';
    }
}

function showError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.login-error');
    if (existingError) existingError.remove();

    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'login-error';
    errorDiv.innerHTML = `
        <i class="ri-error-warning-line"></i>
        <span>${message}</span>
    `;
    
    loginForm.insertBefore(errorDiv, loginBtn);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showNotification(message) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.login-notification');
    if (existingNotification) existingNotification.remove();

    // Create and insert notification message
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'login-notification';
    notificationDiv.innerHTML = `
        <i class="ri-notification-line"></i>
        <span>${message}</span>
    `;
    
    loginForm.insertBefore(notificationDiv, loginBtn);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notificationDiv.remove();
    }, 5000);
}