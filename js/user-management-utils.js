import { doc, updateDoc, arrayUnion, getDoc, getDocs, collection, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from './firebase-config.js';

const initUserIfNeeded = async (userId, email) => {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        await setDoc(userRef, {
            email,
            warnings: [],
            suspensions: [],
            isBanned: false
        });
    }
    return userDoc;
};

export const getAllUsers = async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    return usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const warnUser = async (userId, message) => {
    await initUserIfNeeded(userId);
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        warnings: arrayUnion({
            message,
            date: new Date()
        })
    });
};

export const suspendUser = async (userId, message) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        suspensions: arrayUnion({
            message,
            date: new Date()
        })
    });
};

export const banUser = async (userId, reason) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        isBanned: true,
        banReason: reason,
        banDate: new Date()
    });
};
