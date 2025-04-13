import { auth, db } from '../firebase-config.js';
import { 
    collection, query, getDocs, doc, updateDoc, orderBy, where, 
    getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { checkAdminAuth } from '../auth-utils.js';

let currentAppeal = null;

const formatDate = (timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleString();
};

const renderAppeals = async (status = 'all') => {
    const appealsGrid = document.getElementById('appealsGrid');
    appealsGrid.innerHTML = '';

    const appealsRef = collection(db, 'appeals');
    const q = status === 'all' 
        ? query(appealsRef, orderBy('createdAt', 'desc'))
        : query(appealsRef, where('status', '==', status), orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const appeal = { id: doc.id, ...doc.data() };
        const appealCard = document.createElement('div');
        appealCard.className = `admin-card appeal-card ${appeal.status}`;
        appealCard.innerHTML = `
            <div class="appeal-header">
                <span class="appeal-type">${appeal.appealType}</span>
                <span class="appeal-status ${appeal.status}">${appeal.status}</span>
            </div>
            <h3>${appeal.username}</h3>
            <p>${appeal.reason.split('\n')[0]}...</p>
            <div class="appeal-meta">
                <span>Submitted: ${formatDate(appeal.createdAt)}</span>
            </div>
            <button class="btn review" onclick="showReviewModal('${appeal.id}')">Review Appeal</button>
        `;
        appealsGrid.appendChild(appealCard);
    });
};

window.showReviewModal = async (appealId) => {
    const appealRef = doc(db, 'appeals', appealId);
    const appealSnap = await getDoc(appealRef);
    currentAppeal = { id: appealId, ...appealSnap.data() };
    
    const modal = document.getElementById('reviewModal');
    const details = modal.querySelector('.appeal-details');
    
    details.innerHTML = `
        <div class="appeal-info">
            <p><strong>Username:</strong> ${currentAppeal.username}</p>
            <p><strong>XTS Email:</strong> ${currentAppeal.xtsEmail}</p>
            <p><strong>Real Email:</strong> ${currentAppeal.realEmail}</p>
            <p><strong>Appeal Type:</strong> ${currentAppeal.appealType}</p>
            <p><strong>Previous Appeals:</strong> ${currentAppeal.previousAppeals}</p>
            <p><strong>Submitted:</strong> ${formatDate(currentAppeal.createdAt)}</p>
        </div>
        <div class="appeal-content">
            <h4>Reason for Appeal</h4>
            <p>${currentAppeal.reason.replace(/\n/g, '<br>')}</p>
            ${currentAppeal.additionalContext ? `
                <h4>Additional Context</h4>
                <p>${currentAppeal.additionalContext.replace(/\n/g, '<br>')}</p>
            ` : ''}
            ${currentAppeal.evidence ? `
                <h4>Evidence Provided</h4>
                <p>${currentAppeal.evidence.replace(/\n/g, '<br>')}</p>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'flex';
};

window.closeModal = () => {
    document.getElementById('reviewModal').style.display = 'none';
    currentAppeal = null;
};

window.handleAppeal = async (action) => {
    if (!currentAppeal) return;
    
    try {
        const appealRef = doc(db, 'appeals', currentAppeal.id);
        await updateDoc(appealRef, {
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewedAt: serverTimestamp(),
            reviewedBy: auth.currentUser.uid
        });
        
        closeModal();
        renderAppeals(document.getElementById('statusFilter').value);
    } catch (error) {
        console.error('Error updating appeal:', error);
        alert('Error updating appeal. Please try again.');
    }
};

// Initialize
checkAdminAuth().then(() => {
    renderAppeals();
    
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        renderAppeals(e.target.value);
    });
    
    document.getElementById('signOut').addEventListener('click', () => {
        auth.signOut();
        window.location.href = '../login.html';
    });
}).catch(() => {
    window.location.href = '../login.html';
});
