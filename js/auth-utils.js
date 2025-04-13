import { signInWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

export const checkAuth = () => {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = '/login.html';
                reject('No user logged in');
            }
            resolve(user);
        });
    });
};

export const signIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const signOutUser = async () => {
    try {
        await firebaseSignOut(auth);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
};

export const isAdmin = (user) => {
    return user?.email === 'super@xts.admin';
};

export const checkAdminAuth = () => {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (!user || !isAdmin(user)) {
                window.location.href = '/login.html';
                reject('Unauthorized access');
            }
            resolve(user);
        });
    });
};

export const checkUserStatus = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const latestWarning = userData.warnings?.[userData.warnings.length - 1];
    const latestSuspension = userData.suspensions?.[userData.suspensions.length - 1];

    return {
        hasUnreadWarning: latestWarning && !latestWarning.read,
        hasUnreadSuspension: latestSuspension && !latestSuspension.read
    };
};
