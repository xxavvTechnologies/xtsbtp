import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export const submitAppeal = async (appealData) => {
    try {
        const appealsRef = collection(db, 'appeals');
        const appealWithTimestamp = {
            ...appealData,
            status: 'pending',
            createdAt: serverTimestamp()
        };
        
        await addDoc(appealsRef, appealWithTimestamp);
        return true;
    } catch (error) {
        console.error('Error submitting appeal:', error);
        throw error;
    }
};

// Initialize form handler
document.getElementById('appealForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        const appealData = {
            realEmail: form.realEmail.value,
            xtsEmail: form.xtsEmail.value,
            username: form.username.value,
            appealType: form.appealType.value,
            previousAppeals: form.previousAppeals.value,
            reason: form.reason.value,
            additionalContext: form.additionalContext.value,
            evidence: form.evidence.value,
            confirmedTruth: form.confirmTruth.checked
        };

        await submitAppeal(appealData);
        form.style.display = 'none';
        document.querySelector('.appeal-success').style.display = 'block';
    } catch (error) {
        alert('Error submitting appeal. Please try again.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Appeal';
    }
});
