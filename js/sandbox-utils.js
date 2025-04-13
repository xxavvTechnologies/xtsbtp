import { collection, getDocs, addDoc, doc, updateDoc, getDoc, arrayUnion, arrayRemove, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from './firebase-config.js';

async function getUserEmail(userId) {
    if (!userId) return null;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;
    return userDoc.data()?.email || null;
}

export const getSandboxes = async (userId) => {
    const sandboxesSnapshot = await getDocs(collection(db, "sandboxes"));
    const userEmail = await getUserEmail(userId);

    return sandboxesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })).filter(sandbox => {
        if (!userEmail) return true; // Show all sandboxes if no user email
        const leftUsers = sandbox.leftUsers || [];
        return !leftUsers.includes(userEmail);
    });
};

export const enrollInSandbox = async (userId, sandboxId) => {
    const sandboxRef = doc(db, "sandboxes", sandboxId);
    await updateDoc(sandboxRef, {
        enrolledUsers: arrayUnion(userId)
    });
};

export const leaveSandbox = async (userId, sandboxId) => {
    const userEmail = await getUserEmail(userId);
    if (!userEmail) return;

    const sandboxRef = doc(db, "sandboxes", sandboxId);
    const sandboxDoc = await getDoc(sandboxRef);
    if (!sandboxDoc.exists()) return;

    await updateDoc(sandboxRef, {
        enrolledUsers: arrayRemove(userId),
        leftUsers: arrayUnion(userEmail)
    });

    // Add to user's left sandboxes
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
        leftSandboxes: arrayUnion(sandboxId)
    }, { merge: true });
};

export const createSandbox = async (sandboxData) => {
    try {
        const docRef = await addDoc(collection(db, "sandboxes"), {
            ...sandboxData,
            enrolledUsers: [],
            createdAt: new Date(),
            status: 'active'
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating sandbox:", error);
        throw error;
    }
};
