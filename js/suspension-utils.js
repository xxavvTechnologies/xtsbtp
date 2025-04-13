import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from './firebase-config.js';

export const checkSuspensionStatus = async (userId) => {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const latestSuspension = userData.suspensions?.[userData.suspensions.length - 1];
    
    if (!latestSuspension) return null;

    const suspensionDate = latestSuspension.date.toDate();
    const endDate = new Date(suspensionDate.getTime() + (48 * 60 * 60 * 1000));
    const now = new Date();

    if (now < endDate) {
        return {
            active: true,
            reason: latestSuspension.message,
            endDate,
            timeLeft: endDate.getTime() - now.getTime()
        };
    }

    return { active: false };
};
