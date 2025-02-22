import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc, 
    where,
    orderBy,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// DOM Elements
const feedbackList = document.getElementById('feedbackList');
const sandboxFilter = document.getElementById('sandboxFilter');
const typeFilter = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');
const feedbackDetail = document.getElementById('feedbackDetail');
let currentFeedback = null;

// Initialize filters
async function initializeFilters() {
    // Load sandboxes for filter
    const sandboxesSnapshot = await getDocs(collection(db, 'sandboxes'));
    sandboxFilter.innerHTML = '<option value="">All Sandboxes</option>';
    sandboxesSnapshot.forEach(doc => {
        const sandbox = doc.data();
        sandboxFilter.innerHTML += `
            <option value="${doc.id}">${sandbox.name}</option>
        `;
    });
}

// Load feedback items
async function loadFeedback() {
    try {
        let q = query(
            collection(db, 'feedback'),
            orderBy('createdAt', 'desc')
        );

        // Apply filters
        if (sandboxFilter.value) {
            q = query(q, where('sandboxId', '==', sandboxFilter.value));
        }
        if (typeFilter.value) {
            q = query(q, where('type', '==', typeFilter.value));
        }
        if (statusFilter.value) {
            q = query(q, where('status', '==', statusFilter.value));
        }

        const snapshot = await getDocs(q);
        feedbackList.innerHTML = '';

        if (snapshot.empty) {
            feedbackList.innerHTML = `
                <div class="empty-state">
                    <p>No feedback items found</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const feedback = doc.data();
            const date = feedback.createdAt?.toDate().toLocaleDateString() || 'N/A';
            
            feedbackList.innerHTML += `
                <div class="feedback-item ${currentFeedback?.id === doc.id ? 'active' : ''}" 
                    onclick="showFeedbackDetail('${doc.id}')">
                    <div class="feedback-header">
                        <h3 class="feedback-title">${feedback.title}</h3>
                        <div class="status-badge ${feedback.status}">${feedback.status}</div>
                    </div>
                    <div class="feedback-meta">
                        <div><i class="ri-user-line"></i>${feedback.userEmail}</div>
                        <div><i class="ri-calendar-line"></i>${date}</div>
                    </div>
                </div>
            `;
        });

        // If there's a currently selected feedback, keep showing it
        if (currentFeedback) {
            showFeedbackDetail(currentFeedback.id);
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        feedbackList.innerHTML = `
            <div class="error-state">
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

// Add function to show feedback detail
window.showFeedbackDetail = async (feedbackId) => {
    try {
        const docSnap = await getDoc(doc(db, 'feedback', feedbackId));
        if (!docSnap.exists()) return;

        currentFeedback = { id: feedbackId, ...docSnap.data() };
        const date = currentFeedback.createdAt?.toDate().toLocaleDateString() || 'N/A';
        
        // Update UI to show active state
        document.querySelectorAll('.feedback-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('onclick').includes(feedbackId));
        });

        feedbackDetail.innerHTML = `
            <div class="feedback-detail">
                <div class="feedback-header">
                    <h2>${currentFeedback.title}</h2>
                    <div class="status-badge ${currentFeedback.status}">${currentFeedback.status}</div>
                </div>
                
                <div class="feedback-meta">
                    <div><i class="ri-user-line"></i>${currentFeedback.userEmail}</div>
                    <div><i class="ri-calendar-line"></i>${date}</div>
                    <div><i class="ri-folder-line"></i>${currentFeedback.sandboxName}</div>
                    <div><i class="ri-price-tag-3-line"></i>${currentFeedback.type}</div>
                    <div><i class="ri-alarm-warning-line"></i>${currentFeedback.priority}</div>
                </div>

                <div class="feedback-content">
                    <h3>Description</h3>
                    <p>${currentFeedback.description}</p>
                    
                    ${currentFeedback.reproductionSteps ? `
                        <h3>Steps to Reproduce</h3>
                        <p>${currentFeedback.reproductionSteps}</p>
                    ` : ''}
                </div>

                <div class="feedback-actions">
                    <select class="status-select" 
                        onchange="updateFeedbackStatus('${feedbackId}', this.value)">
                        <option value="pending" ${currentFeedback.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in-progress" ${currentFeedback.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${currentFeedback.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="closed" ${currentFeedback.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                    <button class="delete-feedback" onclick="deleteFeedback('${feedbackId}')">
                        <i class="ri-delete-bin-line"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading feedback detail:', error);
        feedbackDetail.innerHTML = `
            <div class="error-state">
                <p>Error loading feedback details</p>
            </div>
        `;
    }
};

// Update feedback status
window.updateFeedbackStatus = async (feedbackId, newStatus) => {
    if (!feedbackId || typeof feedbackId !== 'string') {
        console.error('Invalid feedback ID');
        return;
    }
    
    const validStatuses = ['pending', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(newStatus)) {
        console.error('Invalid status');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'feedback', feedbackId), {
            status: newStatus,
            updatedAt: new Date()
        });
        await loadFeedback(); // This will maintain the detail view
    } catch (error) {
        console.error('Error updating feedback status:', error);
        showNotification('Failed to update status. Please try again.');
    }
};

// Delete feedback
window.deleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
        await deleteDoc(doc(db, 'feedback', feedbackId));
        currentFeedback = null;
        feedbackDetail.innerHTML = `
            <div class="feedback-placeholder">
                <i class="ri-feedback-line"></i>
                <p>Select feedback to view details</p>
            </div>
        `;
        await loadFeedback();
    } catch (error) {
        console.error('Error deleting feedback:', error);
        alert('Failed to delete feedback');
    }
};

// Add event listeners to filters
[sandboxFilter, typeFilter, statusFilter].forEach(filter => {
    filter.addEventListener('change', loadFeedback);
});

// Initialize
initializeFilters().then(() => loadFeedback());
