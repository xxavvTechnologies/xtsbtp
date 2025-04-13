import { collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from './firebase-config.js';

export const submitFeedback = async (feedbackData) => {
    try {
        const docRef = await addDoc(collection(db, "feedback"), {
            ...feedbackData,
            createdAt: new Date(),
            status: 'new'
        });
        return docRef.id;
    } catch (error) {
        console.error("Error submitting feedback:", error);
        throw error;
    }
};

export const getFeedback = async () => {
    const querySnapshot = await getDocs(collection(db, "feedback"));
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const updateFeedbackStatus = async (feedbackId, status) => {
    const feedbackRef = doc(db, "feedback", feedbackId);
    await updateDoc(feedbackRef, {
        status,
        updatedAt: new Date()
    });
};

export const getUserFeedback = async (userId) => {
    const q = query(
        collection(db, "feedback"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addReplyToFeedback = async (feedbackId, reply) => {
    const feedbackRef = doc(db, "feedback", feedbackId);
    await updateDoc(feedbackRef, {
        adminReply: reply,
        status: 'inProgress',
        repliedAt: new Date()
    });
};
