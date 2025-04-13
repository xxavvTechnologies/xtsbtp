import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from './firebase-config.js';

export const getUserStatus = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        return {
            warnings: [],
            suspensions: [],
            isBanned: false,
            banReason: null,
            status: 'active'
        };
    }

    const userData = userDoc.data();
    return {
        warnings: userData.warnings || [],
        suspensions: userData.suspensions || [],
        isBanned: userData.isBanned || false,
        banReason: userData.banReason,
        status: userData.isBanned ? 'banned' : 
               userData.suspensions?.length > 0 ? 'suspended' : 
               userData.warnings?.length > 0 ? 'warned' : 'active'
    };
};
