import { auth, db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const sandboxesContainer = document.getElementById('sandboxes');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const adminLink = document.getElementById('adminLink');

// Add new DOM elements
const sandboxLightbox = document.getElementById('sandboxLightbox');
const closeLightbox = document.getElementById('closeLightbox');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxDescription = document.getElementById('lightboxDescription');
const lightboxParticipants = document.getElementById('lightboxParticipants');
const lightboxEnrollBtn = document.getElementById('lightboxEnrollBtn');

// Add account header elements
const userAvatar = document.getElementById('userAvatar');
const accountEmailHeader = document.getElementById('accountEmailHeader');

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

    // Check admin status
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.data()?.isAdmin) {
        adminLink.style.display = 'none';
    }

    loadSandboxes();
});

// Function to truncate text
function truncateText(text, maxLength = 200) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Update renderSandbox function
function renderSandbox(sandbox) {
    return `
        <div class="sandbox-card" data-sandbox-id="${sandbox.id}">
            <div class="card-header">
                <h3>${sandbox.name}</h3>
                <span class="status-badge ${sandbox.status}">${sandbox.status}</span>
            </div>
            <div class="card-content">
                <p class="description truncated">${truncateText(sandbox.description)}</p>
                <div class="card-footer">
                    <div class="participants">
                        <i class="ri-user-line"></i>
                        <span>${sandbox.participants}/${sandbox.maxParticipants}</span>
                    </div>
                    <button class="enroll-button" 
                        ${sandbox.participants >= sandbox.maxParticipants ? 'disabled' : ''}>
                        ${sandbox.participants < sandbox.maxParticipants ? 'Enroll Now' : 'Full'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Make functions globally accessible
window.showSandboxDetails = async function(sandboxId) {
    const sandboxRef = doc(db, 'sandboxes', sandboxId);
    const sandboxSnap = await getDoc(sandboxRef);
    const sandbox = { id: sandboxId, ...sandboxSnap.data() };

    lightboxTitle.textContent = sandbox.name;
    lightboxDescription.textContent = sandbox.description;
    lightboxParticipants.textContent = `${sandbox.participants}/${sandbox.maxParticipants}`;
    
    const isFull = sandbox.participants >= sandbox.maxParticipants;
    lightboxEnrollBtn.textContent = isFull ? 'Full' : 'Enroll Now';
    lightboxEnrollBtn.disabled = isFull;
    lightboxEnrollBtn.onclick = () => enrollInSandbox(sandboxId);

    sandboxLightbox.classList.add('active');
}

window.enrollInSandbox = async function(sandboxId) {
    // ...existing enrollInSandbox code...
}

// Add event listeners for lightbox
closeLightbox.addEventListener('click', () => {
    sandboxLightbox.classList.remove('active');
});

sandboxLightbox.addEventListener('click', (e) => {
    if (e.target === sandboxLightbox) {
        sandboxLightbox.classList.remove('active');
    }
});

// Update template in the html to make cards clickable
document.getElementById('sandboxTemplate').innerHTML = `
    <div class="sandbox-card" onclick="{onclick}">
        <div class="card-header">
            <h3>{name}</h3>
            <span class="status-badge {status}">{status}</span>
        </div>
        <div class="card-content">
            <p class="description truncated">{description}</p>
            <div class="card-footer">
                <div class="participants">
                    <i class="ri-user-line"></i>
                    <span>{participants}/{maxParticipants}</span>
                </div>
                <button class="enroll-button" 
                    onclick="event.stopPropagation(); enrollInSandbox('{id}')" 
                    {disabled}>{buttonText}</button>
            </div>
        </div>
    </div>
`;

// ...rest of existing code...

async function loadSandboxes() {
    const sandboxesRef = collection(db, 'sandboxes');
    const snapshot = await getDocs(sandboxesRef);
    sandboxesContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
        const sandbox = { id: doc.id, ...doc.data() };
        sandboxesContainer.innerHTML += renderSandbox(sandbox);
    });

    // Add click listeners to cards
    document.querySelectorAll('.sandbox-card').forEach(card => {
        card.addEventListener('click', () => {
            showSandboxDetails(card.dataset.sandboxId);
        });

        // Prevent enrollment button from triggering card click
        const enrollBtn = card.querySelector('.enroll-button');
        enrollBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            enrollInSandbox(card.dataset.sandboxId);
        });
    });
}

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});
