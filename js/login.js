import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');

// Check if already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check if user document exists, if not create it
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            // Create new user document
            await setDoc(userDocRef, {
                email: user.email,
                createdAt: new Date().toISOString(),
                isAdmin: user.email === 'super@xts.admin', // Set admin for specific email
                activePrograms: [],
                completedPrograms: []
            });
            console.log('Created new user document');
        }
        
        window.location.href = 'dashboard.html';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // User document creation is handled in onAuthStateChanged
    } catch (error) {
        console.error('Login error:', error);
        alert(`Login failed: ${error.message}`);
    }
});