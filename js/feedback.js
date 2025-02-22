import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// DOM Elements
const feedbackForm = document.getElementById('feedbackForm');
const sandboxSelect = document.getElementById('sandboxSelect');
const userAvatar = document.getElementById('userAvatar');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const adminLink = document.getElementById('adminLink');

// Add new DOM elements
const historyList = document.getElementById('feedbackHistoryList');
const feedbackContent = document.getElementById('feedbackContent');
const newFeedbackBtn = document.getElementById('newFeedbackBtn');
const historyTypeFilter = document.getElementById('historyTypeFilter');
const historyStatusFilter = document.getElementById('historyStatusFilter');

// Auth check
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Update user info in header
    const initials = user.email.substring(0, 2).toUpperCase();
    userAvatar.textContent = initials;
    userEmail.textContent = user.email;

    // Load sandboxes for select dropdown
    await Promise.all([
        loadSandboxes(),
        loadFeedbackHistory()
    ]);
});

// Load sandboxes into select dropdown
async function loadSandboxes() {
    try {
        const sandboxesCollection = collection(db, 'sandboxes');
        const snapshot = await getDocs(sandboxesCollection);
        
        sandboxSelect.innerHTML = '<option value="">Choose a sandbox...</option>';
        
        snapshot.forEach(doc => {
            const sandbox = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = sandbox.name;
            sandboxSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading sandboxes:', error);
        alert('Failed to load sandboxes. Please try again later.');
    }
}

// Handle form submission
feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = feedbackForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="ri-loader-4-line"></i> Submitting...';

    try {
        const user = auth.currentUser;
        const feedback = {
            userId: user.uid,
            userEmail: user.email,
            sandboxId: sandboxSelect.value,
            sandboxName: sandboxSelect.options[sandboxSelect.selectedIndex].text,
            type: document.getElementById('feedbackType').value,
            title: document.getElementById('feedbackTitle').value,
            description: document.getElementById('feedbackDescription').value,
            priority: document.getElementById('feedbackPriority').value,
            reproductionSteps: document.getElementById('reproductionSteps').value,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'feedback'), feedback);

        // Show success message
        alert('Thank you for your feedback!');
        feedbackForm.reset();

        showNotification('Feedback submitted successfully!');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to submit feedback. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="ri-send-plane-line"></i> Submit Feedback';
    }
});

// Add function to load feedback history
async function loadFeedbackHistory() {
    try {
        const user = auth.currentUser;
        let q = query(
            collection(db, 'feedback'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        // Apply filters
        if (historyTypeFilter.value) {
            q = query(q, where('type', '==', historyTypeFilter.value));
        }
        if (historyStatusFilter.value) {
            q = query(q, where('status', '==', historyStatusFilter.value));
        }

        const snapshot = await getDocs(q);
        historyList.innerHTML = '';

        if (snapshot.empty) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <p>No feedback submissions found</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const feedback = doc.data();
            const date = feedback.createdAt?.toDate().toLocaleDateString() || 'N/A';
            
            historyList.innerHTML += `
                <div class="feedback-history-item" onclick="showFeedbackDetail('${doc.id}')">
                    <div class="feedback-header">
                        <h3 class="feedback-title">${feedback.title}</h3>
                        <div class="status-badge ${feedback.status}">${feedback.status}</div>
                    </div>
                    <div class="feedback-meta">
                        <div><i class="ri-calendar-line"></i>${date}</div>
                        <div><i class="ri-folder-line"></i>${feedback.sandboxName}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading feedback history:', error);
        historyList.innerHTML = `
            <div class="error-state">
                <p>Error loading feedback history</p>
            </div>
        `;
    }
}

// Add function to show feedback detail
window.showFeedbackDetail = async (feedbackId) => {
    try {
        const docSnap = await getDoc(doc(db, 'feedback', feedbackId));
        if (!docSnap.exists()) return;

        const feedback = docSnap.data();
        const date = feedback.createdAt?.toDate().toLocaleDateString() || 'N/A';

        feedbackContent.innerHTML = `
            <div class="feedback-detail">
                <div class="feedback-detail-header">
                    <h2>${feedback.title}</h2>
                    <div class="status-badge ${feedback.status}">${feedback.status}</div>
                </div>
                
                <div class="feedback-meta">
                    <div><i class="ri-calendar-line"></i>${date}</div>
                    <div><i class="ri-folder-line"></i>${feedback.sandboxName}</div>
                    <div><i class="ri-price-tag-3-line"></i>${feedback.type}</div>
                    <div><i class="ri-alarm-warning-line"></i>${feedback.priority}</div>
                </div>

                <div class="feedback-content">
                    <h3>Description</h3>
                    <p>${feedback.description}</p>
                    
                    ${feedback.reproductionSteps ? `
                        <h3>Steps to Reproduce</h3>
                        <p>${feedback.reproductionSteps}</p>
                    ` : ''}
                </div>
            </div>
        `;

        // Update active state in list
        document.querySelectorAll('.feedback-history-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('onclick').includes(feedbackId));
        });
    } catch (error) {
        console.error('Error loading feedback detail:', error);
        feedbackContent.innerHTML = `
            <div class="error-state">
                <p>Error loading feedback details</p>
            </div>
        `;
    }
};

// Show new feedback form
newFeedbackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    feedbackContent.innerHTML = feedbackForm.outerHTML;
});

// Add filter listeners
[historyTypeFilter, historyStatusFilter].forEach(filter => {
    filter.addEventListener('change', loadFeedbackHistory);
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});
