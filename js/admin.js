import { auth, db, rtdb } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, onChildAdded, push, off, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Add these constants at the top
const TYPING_TIMEOUT = 2000;
const ADMIN_BADGE_HTML = `<span class="support-badge"><i class="ri-verified-badge-fill"></i> Official Support</span>`;
let typingTimeout = null;
let lastTypingStatus = false;

// DOM Elements
const usersList = document.getElementById('usersList');
const chatInterface = document.getElementById('chatInterface');
const chatPlaceholder = document.getElementById('chatPlaceholder');
const currentChatUser = document.getElementById('currentChatUser');
const adminMessages = document.getElementById('adminMessages');
const adminMessageForm = document.getElementById('adminMessageForm');
const adminMessageInput = document.getElementById('adminMessageInput');
const userSearch = document.getElementById('userSearch');

let currentChatId = null;
let messageListeners = {};
const ADMIN_EMAIL = 'super@xts.admin';

// Add a cleanup function at the top
let currentMessageListener = null;

// Initialize admin view
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    if (user.email !== ADMIN_EMAIL) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Update admin UI
    if (userEmail) userEmail.textContent = user.email;
    await loadAllUsers();
});

// Add user data validation helper
function isValidUserData(userData) {
    return userData && typeof userData === 'object' && 
           typeof userData.email === 'string' && 
           userData.email.length > 0;
}

// Load all users with validation
async function loadAllUsers() {
    try {
        // Query users excluding admin
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '!=', ADMIN_EMAIL));
        const snapshot = await getDocs(q);

        if (usersList) {
            usersList.innerHTML = '';
            
            if (snapshot.empty) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <p>No users found</p>
                    </div>`;
                return;
            }

            snapshot.forEach(doc => {
                const userData = doc.data();
                createUserListItem(doc.id, userData);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        if (usersList) {
            usersList.innerHTML = `
                <div class="error-state">
                    <p>Error: ${error.message}</p>
                </div>`;
        }
    }
}

// Create user list item with validation
function createUserListItem(userId, userData) {
    if (!isValidUserData(userData)) return;

    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = userId;
    div.dataset.email = userData.email;
    
    const initials = userData.email.substring(0, 2).toUpperCase();
    
    div.innerHTML = `
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
            <div class="user-email">${userData.email}</div>
            <div class="user-status">Click to view chat</div>
        </div>
    `;
    
    div.addEventListener('click', () => loadUserChat(userId, userData));
    usersList.appendChild(div);

    // Start listening for new messages from this user
    listenForNewMessages(userId);
}

// Update listenForNewMessages function
function listenForNewMessages(userId) {
    const messagesRef = ref(rtdb, `direct-messages/${userId}/messages`);
    
    if (messageListeners[userId]) {
        off(messagesRef, 'child_added', messageListeners[userId]);
    }

    messageListeners[userId] = onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        if (currentChatId === userId) {
            appendMessage(message);
        }
        updateUserStatus(userId);
    });
}

// Update user status (shows unread messages)
function updateUserStatus(userId) {
    const userItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (userItem && userId !== currentChatId) {
        const status = userItem.querySelector('.user-status');
        status.textContent = 'New messages';
        status.classList.add('has-unread');
    }
}

// Update loadUserChat function
function loadUserChat(userId, userData) {
    if (!userId || !isValidUserData(userData)) {
        console.error('Invalid user data');
        return;
    }

    currentChatId = userId;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedUser = document.querySelector(`[data-user-id="${userId}"]`);
    if (selectedUser) {
        selectedUser.classList.add('active');
        const status = selectedUser.querySelector('.user-status');
        if (status) {
            status.textContent = 'Active chat';
            status.classList.remove('has-unread');
        }
    }

    if (chatPlaceholder) chatPlaceholder.classList.add('hidden');
    if (chatInterface) chatInterface.classList.remove('hidden');
    if (currentChatUser) currentChatUser.textContent = userData.email;
    if (adminMessages) adminMessages.innerHTML = '';

    // Remove previous listener if exists
    if (currentMessageListener) {
        const oldRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
        off(oldRef, 'child_added', currentMessageListener);
    }

    // Add new listener
    const messagesRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
    currentMessageListener = onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        if (message) appendMessage(message);
    });

    // Listen for user typing status
    const userTypingRef = ref(rtdb, `typing/${userId}/user`);
    onValue(userTypingRef, (snapshot) => {
        const isTyping = snapshot.val();
        updateTypingIndicator(isTyping);
    });
}

// Add typing indicator update function
function updateTypingIndicator(isTyping) {
    const status = document.getElementById('userStatus');
    if (isTyping) {
        status.innerHTML = '<span class="typing-indicator">typing<span>.</span><span>.</span><span>.</span></span>';
    } else {
        status.textContent = 'Active';
    }
}

// Update the appendMessage function
function appendMessage(message) {
    const div = document.createElement('div');
    div.className = `message ${message.senderId === 'support-team' ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    let senderName = message.senderId === 'support-team' ? 
        `<span class="admin-verified">xTS-BT Support ${ADMIN_BADGE_HTML}</span>` : 
        message.senderEmail;
    
    div.innerHTML = `
        <div class="message-content">
            ${message.senderId !== 'support-team' ? `<div class="message-sender">${senderName}</div>` : ''}
            ${message.text}
        </div>
        <span class="message-time">${time}</span>
    `;
    
    adminMessages.appendChild(div);
    adminMessages.scrollTop = adminMessages.scrollHeight;
}

// Update send message functionality
adminMessageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentChatId || !adminMessageInput) return;
    
    const text = adminMessageInput.value.trim();
    if (!text) return;
    
    const message = {
        text,
        timestamp: Date.now(),
        senderId: 'support-team',
        senderEmail: 'xTS-BT Support'
    };
    
    try {
        // Send only to direct-messages collection
        const messagesRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
        await push(messagesRef, message);
        
        adminMessageInput.value = '';
        adminMessageInput.style.height = 'auto';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
});

// Auto-resize textarea
adminMessageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

// Add typing indicator functionality
adminMessageInput.addEventListener('input', () => {
    if (!currentChatId) return;
    
    const typingRef = ref(rtdb, `typing/${currentChatId}/admin`);
    set(typingRef, true);
    
    if (typingTimeout) clearTimeout(typingTimeout);
    
    typingTimeout = setTimeout(() => {
        set(typingRef, false);
    }, TYPING_TIMEOUT);
});

// Add search functionality
userSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const userItems = usersList.getElementsByClassName('user-item');
    
    Array.from(userItems).forEach(item => {
        const email = item.dataset.email.toLowerCase();
        item.style.display = email.includes(searchTerm) ? 'flex' : 'none';
    });
});

// Cleanup
window.addEventListener('unload', () => {
    if (currentMessageListener) {
        const messagesRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
        off(messagesRef, 'child_added', currentMessageListener);
    }
    
    Object.entries(messageListeners).forEach(([userId, listener]) => {
        const userRef = ref(rtdb, `direct-messages/${userId}/messages`);
        off(userRef, 'child_added', listener);
    });
});
