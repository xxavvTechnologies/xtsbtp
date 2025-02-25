// Sample sandbox data
const sandboxes = [
    {
        id: 1,
        name: 'Project Alpha',
        description: 'Early access to our new mobile app',
        status: 'alpha',
        participants: 50,
        maxParticipants: 100
    },
    {
        id: 2,
        name: 'Project Beta',
        description: 'Desktop application testing',
        status: 'beta',
        participants: 75,
        maxParticipants: 150
    }
];

// DOM Elements
const loginSection = document.getElementById('loginSection');
const mainContent = document.getElementById('mainContent');
const adminPanel = document.getElementById('adminPanel');
const sandboxesContainer = document.getElementById('sandboxes');
const loginForm = document.getElementById('loginForm');
const addSandboxForm = document.getElementById('addSandboxForm');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        userEmail.textContent = user.email;
        userEmail.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');

        if (userData.isAdmin) {
            adminPanel.classList.remove('hidden');
        }

        // Show/hide admin nav item
        const adminNavItem = `
            <a href="admin.html" class="mobile-nav-item">
                <i class="ri-settings-4-line"></i>
                <span>Admin</span>
            </a>
        `;
        
        if (isAdmin) {
            document.querySelector('.mobile-nav-items').insertAdjacentHTML('beforeend', adminNavItem);
        }

        loadSandboxes();
    } else {
        loginSection.classList.remove('hidden');
        mainContent.classList.add('hidden');
        userEmail.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        adminPanel.classList.add('hidden');
    }
});

// Load sandboxes from Firestore
async function loadSandboxes() {
    const snapshot = await db.collection('sandboxes').get();
    sandboxesContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
        const sandbox = { id: doc.id, ...doc.data() };
        const card = `
            <div class="sandbox-card">
                <h3>${sandbox.name}</h3>
                <p>${sandbox.description}</p>
                <p>Status: ${sandbox.status}</p>
                <p>Participants: ${sandbox.participants}/${sandbox.maxParticipants}</p>
                <button onclick="enrollInSandbox('${sandbox.id}')" 
                    ${sandbox.participants >= sandbox.maxParticipants ? 'disabled' : ''}>
                    ${sandbox.participants < sandbox.maxParticipants ? 'Enroll Now' : 'Full'}
                </button>
            </div>
        `;
        sandboxesContainer.innerHTML += card;
    });
}

// Login handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
});

// Add sandbox (admin only)
addSandboxForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newSandbox = {
        name: document.getElementById('sandboxName').value,
        description: document.getElementById('sandboxDescription').value,
        status: document.getElementById('sandboxStatus').value,
        maxParticipants: parseInt(document.getElementById('maxParticipants').value),
        participants: 0,
        created: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('sandboxes').add(newSandbox);
        addSandboxForm.reset();
        loadSandboxes();
    } catch (error) {
        alert(`Failed to add sandbox: ${error.message}`);
    }
});

// Enroll in sandbox
async function enrollInSandbox(sandboxId) {
    const sandboxRef = db.collection('sandboxes').doc(sandboxId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const sandbox = await transaction.get(sandboxRef);
            const currentParticipants = sandbox.data().participants;
            const maxParticipants = sandbox.data().maxParticipants;

            if (currentParticipants >= maxParticipants) {
                throw new Error('Sandbox is full');
            }

            transaction.update(sandboxRef, {
                participants: currentParticipants + 1
            });
        });

        alert('Successfully enrolled!');
        loadSandboxes();
    } catch (error) {
        alert(`Failed to enroll: ${error.message}`);
    }
}

// Add this function to your existing app.js
function setActiveMobileNavItem() {
    const currentPath = window.location.pathname;
    const pageName = currentPath.split('/').pop().split('.')[0];
    
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        const itemPath = item.getAttribute('href').split('/').pop().split('.')[0];
        if (itemPath === pageName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', setActiveMobileNavItem);

// Logout
logoutBtn.addEventListener('click', () => auth.signOut());
