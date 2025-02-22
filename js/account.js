import { auth, db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const accountEmail = document.getElementById('accountEmail');
const accountType = document.getElementById('accountType');
const memberSince = document.getElementById('memberSince');
const activePrograms = document.getElementById('activePrograms');
const completedPrograms = document.getElementById('completedPrograms');
const logoutBtn = document.getElementById('logoutBtn');

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Get user data
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();

    // Update UI
    accountEmail.textContent = user.email;
    accountType.textContent = userData?.isAdmin ? 'Administrator' : 'Beta Tester';
    memberSince.textContent = user.metadata.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString()
        : 'N/A';

    // You can add more data fetching here for programs
    activePrograms.textContent = userData?.activePrograms?.length || 0;
    completedPrograms.textContent = userData?.completedPrograms?.length || 0;
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});
