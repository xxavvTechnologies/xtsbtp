import { auth, db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    increment,
    query,
    where 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
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

// Add at the top with other DOM elements
const notificationLightbox = document.getElementById('notificationLightbox');
const notificationMessage = document.getElementById('notificationMessage');
const closeNotification = document.getElementById('closeNotification');
const notificationOkBtn = document.getElementById('notificationOkBtn');

// Add these new DOM elements with the other elements
const termsModal = document.getElementById('termsModal');
const termsCheckbox = document.getElementById('termsCheckbox');
const acceptTermsBtn = document.getElementById('acceptTermsBtn');

// Add at the top with other DOM elements
const termsContent = document.getElementById('termsContent');

// Add at the top with other global variables
let userDocRef = null;

// Auth check
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Set userDocRef when user is authenticated
    userDocRef = doc(db, 'users', user.uid);

    // Update user info in header
    const initials = user.email.substring(0, 2).toUpperCase();
    userAvatar.textContent = initials;
    userEmail.textContent = user.email;

    // Check admin status
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.data()?.isAdmin) {
        adminLink.style.display = 'none';
    }

    // Check for terms acceptance
    await checkAndShowTerms(user);

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
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to enroll.');
            return;
        }

        const sandboxRef = doc(db, 'sandboxes', sandboxId);
        const sandboxSnap = await getDoc(sandboxRef);
        const sandboxData = sandboxSnap.data();

        if (sandboxData.participants >= sandboxData.maxParticipants) {
            alert('Sorry, this sandbox is full.');
            return;
        }

        // Check if user is already enrolled
        const enrollmentsRef = collection(db, 'enrollments');
        const q = query(enrollmentsRef, 
            where('userId', '==', user.uid),
            where('sandboxId', '==', sandboxId)
        );
        const enrollmentSnap = await getDocs(q);

        if (!enrollmentSnap.empty) {
            alert('You are already enrolled in this sandbox.');
            return;
        }

        // Create enrollment
        await addDoc(collection(db, 'enrollments'), {
            userId: user.uid,
            sandboxId: sandboxId,
            enrolledAt: new Date(),
            userEmail: user.email
        });

        // Update sandbox participants count
        await updateDoc(sandboxRef, {
            participants: increment(1)
        });

        const successMessage = `You have been enrolled in the sandbox. You should receive access details within 24 hours through one of these channels:

• Email
• In-app message
• Text message (if provided)

Please make sure to check your spam folder if you don't see the email.`;

        showNotification(successMessage);
        loadSandboxes(); // Refresh the display
        
        // Close sandbox lightbox if it's open
        if (sandboxLightbox.classList.contains('active')) {
            sandboxLightbox.classList.remove('active');
        }

    } catch (error) {
        console.error('Error enrolling:', error);
        showNotification('Failed to enroll. Please try again.');
    }
};

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

// Add this function after other function declarations
function showNotification(message) {
    notificationMessage.textContent = message;
    notificationLightbox.classList.add('active');
}

// Add event listeners for notification lightbox
[closeNotification, notificationOkBtn].forEach(element => {
    element.addEventListener('click', () => {
        notificationLightbox.classList.remove('active');
    });
});

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

// Add this function with the other functions
async function checkAndShowTerms(user) {
    try {
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();

        if (!userData?.agreedToTerms) {
            await loadTermsContent();
            termsModal.classList.add('active');
            
            // Remove any existing event listeners to prevent duplicates
            termsCheckbox?.removeEventListener('change', handleTermsChange);
            acceptTermsBtn?.removeEventListener('click', handleTermsAccept);
            
            // Add event listeners
            termsCheckbox?.addEventListener('change', handleTermsChange);
            acceptTermsBtn?.addEventListener('click', handleTermsAccept);
        }
    } catch (error) {
        console.error('Error checking terms acceptance:', error);
    }
}

// Add this function with the other functions
async function loadTermsContent() {
    termsContent.innerHTML = `
        <div class="terms-section">
            <p>These Terms govern your access to and use of beta versions of xxavvTechnologies products and services.</p>

            <p>Welcome to the xxavvTechnologies Beta Tester Program! By participating in this program, you agree to the following Terms and Conditions ("Terms"). These Terms govern your access to and use of beta versions of xxavvTechnologies products and services. If you do not agree to these Terms, you may not participate in the Beta Tester Program.</p>

            <h4>1. Acceptance of Terms</h4>
            <p>By enrolling in the xxavvTechnologies Beta Tester Program, you acknowledge that:</p>
            <ul>
                <li>You are at least 18 years old or have obtained parental/guardian consent if under 18.</li>
                <li>You voluntarily participate in testing pre-release software, applications, or services.</li>
                <li>You understand that beta products are not final and may contain bugs, errors, or incomplete features.</li>
            </ul>

            <h4>2. Confidentiality Agreement</h4>
            <p>All information regarding beta products, including new features, functionality, or updates, is strictly confidential unless publicly announced by xxavvTechnologies.</p>
            
            <p>You agree not to:</p>
            <ul>
                <li>Share, distribute, or disclose any screenshots, videos, or details of the beta program.</li>
                <li>Discuss beta features or issues in public forums, social media, or external platforms.</li>
                <li>Reverse engineer, modify, or attempt to access the source code of any beta software.</li>
            </ul>
            <p>Violating this confidentiality agreement may result in immediate removal from the program and possible legal action.</p>

            <h4>3. License & Use Restrictions</h4>
            <p>xxavvTechnologies grants you a limited, non-exclusive, non-transferable license to access and use beta products for testing purposes only.</p>
            
            <p>You may not:</p>
            <ul>
                <li>Use beta software for commercial purposes.</li>
                <li>Share your beta access credentials or allow others to use your account.</li>
                <li>Attempt to exploit, bypass, or manipulate system vulnerabilities.</li>
            </ul>

            <h4>4. Feedback & Reporting Issues</h4>
            <p>As a beta tester, you agree to provide constructive feedback on product performance, usability, and bugs. Your input helps improve the final release.</p>
            <ul>
                <li>Bug Reporting: You must report issues via the designated feedback form or email.</li>
                <li>Surveys & Interviews: You may be invited to participate in user feedback sessions.</li>
                <li>Feature Suggestions: While all feedback is valued, xxavvTechnologies is not obligated to implement suggestions.</li>
            </ul>

            <h4>5. No Compensation or Warranties</h4>
            <p>Participation in the Beta Tester Program is voluntary and unpaid. You will not receive financial compensation, credits, or rewards for testing.</p>
            
            <p>Beta products are provided "as is" without warranties of any kind, including:</p>
            <ul>
                <li>Reliability – Features may not work as intended.</li>
                <li>Data Loss – xxavvTechnologies is not responsible for lost or corrupted data.</li>
                <li>Service Availability – Beta products may go offline or be discontinued at any time.</li>
            </ul>

            <h4>6. Data Collection & Privacy</h4>
            <p>xxavvTechnologies may collect anonymized usage data during beta testing to improve its products. This may include:</p>
            <ul>
                <li>Performance Metrics (e.g., app crashes, loading times)</li>
                <li>User Interactions (e.g., feature usage patterns)</li>
                <li>Bug Reports & Feedback</li>
            </ul>
            <p>We do not sell or share your personal data. For more details, review our Privacy Policy.</p>

            <h4>7. Termination & Revocation of Access</h4>
            <p>xxavvTechnologies reserves the right to terminate or suspend your beta access at any time if:</p>
            <ul>
                <li>You violate these Terms (e.g., breach confidentiality, misuse software).</li>
                <li>You are inactive or fail to provide useful feedback.</li>
                <li>The beta program is discontinued.</li>
            </ul>
            <p>You may also voluntarily opt out at any time by emailing beta.xts@xxavvgroup.com.</p>

            <h4>8. Changes to These Terms</h4>
            <p>xxavvTechnologies may update these Terms at any time. Continued participation after changes are posted constitutes your acceptance of the revised Terms. We will notify you of any major updates via email.</p>

            <h4>9. Contact Information</h4>
            <p>For questions or concerns, contact the xxavvTechnologies Beta Testing Team at:</p>
            <p>✉ beta.xts@xxavvgroup.com</p>

            <p>By participating in this program, you acknowledge that you have read, understood, and agreed to these Beta Tester Terms and Conditions. 🚀</p>
        </div>
    `;
}

// Add cleanup for event listeners
window.addEventListener('beforeunload', () => {
    // Remove event listeners
    termsCheckbox?.removeEventListener('change', handleTermsChange);
    acceptTermsBtn?.removeEventListener('click', handleTermsAccept);
    closeNotification?.removeEventListener('click', handleNotificationClose);
});

// Define event handler functions
function handleTermsChange() {
    acceptTermsBtn.disabled = !termsCheckbox.checked;
}

// Update the terms acceptance handler
async function handleTermsAccept() {
    if (!termsCheckbox.checked || !userDocRef) {
        return;
    }

    try {
        await updateDoc(userDocRef, {
            agreedToTerms: true,
            termsAcceptedAt: new Date(),
            termsVersion: '1.0'
        });
        termsModal.classList.remove('active');
        showNotification('Terms & Conditions accepted successfully!');
    } catch (error) {
        console.error('Error updating terms acceptance:', error);
        showNotification('Failed to update terms acceptance. Please try again.');
    }
}

function handleNotificationClose() {
    notificationLightbox.classList.remove('active');
}
