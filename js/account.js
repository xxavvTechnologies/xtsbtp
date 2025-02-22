import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// DOM Elements with null checks
const accountEmail = document.getElementById('accountEmail');
const accountType = document.getElementById('accountType');
const memberSince = document.getElementById('memberSince');
const termsStatus = document.getElementById('termsStatus');
const termsDate = document.getElementById('termsDate');
const termsVersion = document.getElementById('termsVersion');
const enrollmentsList = document.getElementById('enrollmentsList');
const activePrograms = document.getElementById('activePrograms');
const completedPrograms = document.getElementById('completedPrograms');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');

// Verify all elements exist
const elements = {
    accountEmail,
    accountType,
    memberSince,
    termsStatus,
    termsDate,
    termsVersion,
    enrollmentsList,
    activePrograms,
    completedPrograms,
    logoutBtn,
    userAvatar
};

// Check for missing elements and log errors
Object.entries(elements).forEach(([name, element]) => {
    if (!element) {
        console.error(`Missing DOM element: ${name}`);
    }
});

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Basic user info
        if (accountEmail) accountEmail.textContent = user.email;
        if (userAvatar) {
            const initials = user.email.substring(0, 2).toUpperCase();
            userAvatar.textContent = initials;
        }

        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        // Update UI with user data - using optional chaining and null checks
        if (accountType) accountType.textContent = userData?.isAdmin ? 'Administrator' : 'Beta Tester';
        if (memberSince) memberSince.textContent = new Date(userData?.createdAt).toLocaleDateString();

        // Terms acceptance info
        if (termsStatus) {
            termsStatus.textContent = userData?.agreedToTerms ? 'Accepted' : 'Not Accepted';
            termsStatus.className = `status-badge ${userData?.agreedToTerms ? 'accepted' : 'pending'}`;
        }
        
        if (termsDate) {
            termsDate.textContent = userData?.termsAcceptedAt ? 
                new Date(userData.termsAcceptedAt.toDate()).toLocaleString() : 'N/A';
        }
        
        if (termsVersion) {
            termsVersion.textContent = userData?.termsVersion || 'N/A';
        }

        // Update program counts
        if (activePrograms) activePrograms.textContent = userData?.activePrograms?.length || 0;
        if (completedPrograms) completedPrograms.textContent = userData?.completedPrograms?.length || 0;

        // Load enrollments only if the container exists
        if (enrollmentsList) {
            const enrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('userId', '==', user.uid)
            );
            
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            if (!enrollmentsSnap.empty) {
                enrollmentsList.innerHTML = ''; // Clear loading state
                
                for (const enrollDoc of enrollmentsSnap.docs) {
                    const enrollData = enrollDoc.data();
                    const sandboxDoc = await getDoc(doc(db, 'sandboxes', enrollData.sandboxId));
                    const sandboxData = sandboxDoc.data();
                    
                    const enrollmentCard = `
                        <div class="enrollment-card">
                            <div class="enrollment-header">
                                <h3>${sandboxData.name}</h3>
                                <span class="status-badge ${sandboxData.status}">${sandboxData.status}</span>
                            </div>
                            <div class="enrollment-details">
                                <p class="enrollment-date">
                                    <i class="ri-calendar-line"></i>
                                    Enrolled: ${new Date(enrollData.enrolledAt.toDate()).toLocaleDateString()}
                                </p>
                                <p class="enrollment-status">
                                    <i class="ri-group-line"></i>
                                    Participants: ${sandboxData.participants}/${sandboxData.maxParticipants}
                                </p>
                            </div>
                        </div>
                    `;
                    
                    enrollmentsList.innerHTML += enrollmentCard;
                }
            } else {
                enrollmentsList.innerHTML = `
                    <div class="no-enrollments">
                        <i class="ri-folder-info-line"></i>
                        <p>You haven't enrolled in any sandboxes yet.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading account data:', error);
    }
});

// Add logout handler if button exists
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
}
