import { auth, db, rtdb } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, push, onChildAdded, off, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { notificationManager } from './notifications.js';

const usersList = document.getElementById('usersList');
const chatInterface = document.getElementById('chatInterface');
const chatPlaceholder = document.getElementById('chatPlaceholder');
const currentChatUser = document.getElementById('currentChatUser');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const userSearch = document.getElementById('userSearch');

let currentUser = null;
let currentChatId = null;
let messageListeners = {};

// Add a cleanup function at the top
let messageListener = null;

// Add after existing imports
let notificationsEnabled = JSON.parse(localStorage.getItem('notifications') ?? 'true');

// Initialize chat
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    await loadAllUsers();
    setupNotificationToggle(); // Add this line
});

// Load all users except current user
async function loadAllUsers() {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '!=', currentUser.email));
        const snapshot = await getDocs(q);
        
        usersList.innerHTML = snapshot.empty ? '<p>No users found</p>' : '';
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            createUserListItem(doc.id, userData);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = '<p>Error loading users</p>';
    }
}

// Create user list item
function createUserListItem(userId, userData) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = userId;
    div.dataset.email = userData.email;
    
    const initials = userData.email.substring(0, 2).toUpperCase();
    
    div.innerHTML = `
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
            <div class="user-email">${userData.email}</div>
            <div class="user-status">Click to chat</div>
        </div>
    `;
    
    div.addEventListener('click', () => startChat(userId, userData));
    usersList.appendChild(div);
}

// Start or continue chat with user
function startChat(userId, userData) {
    // Create a unique chat ID sorted by user IDs
    const chatUsers = [currentUser.uid, userId].sort();
    currentChatId = `chat_${chatUsers.join('_')}`;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedUser = document.querySelector(`[data-user-id="${userId}"]`);
    if (selectedUser) selectedUser.classList.add('active');

    chatPlaceholder.classList.add('hidden');
    chatInterface.classList.remove('hidden');
    currentChatUser.textContent = userData.email;
    messagesContainer.innerHTML = '';

    // Remove previous listener if exists
    if (messageListener) {
        const oldRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
        off(oldRef, 'child_added', messageListener);
    }

    // Add new listener
    const messagesRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
    messageListener = onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        appendMessage(message);
        
        // Send notification if message is received and chat is not visible
        if (message.senderId !== currentUser.uid && 
            notificationsEnabled && 
            document.hidden) {
            notificationManager.notify('New Message', {
                body: `${message.senderEmail}: ${message.text}`,
                tag: 'chat-message'
            });
        }
    });
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentChatId) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        text,
        timestamp: Date.now(),
        senderId: currentUser.uid,
        senderEmail: currentUser.email
    };
    
    try {
        const messagesRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
        await push(messagesRef, message);
        messageInput.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
});  // <- Added missing closing parenthesis

// Update the appendMessage function
function appendMessage(message) {
    try {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-wrapper ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageWrapper.innerHTML = `
            <div class="message">${message.text}</div>
            <span class="message-time">${time}</span>
        `;
        
        messagesContainer.appendChild(messageWrapper);
        scrollToBottom();

        // Send notification if message is received and window is not focused
        if (message.senderId !== currentUser.uid && 
            notificationsEnabled && 
            (!document.hasFocus() || document.hidden)) {
            notificationManager.notify('New Message', {
                body: `${message.senderEmail}: ${message.text}`,
                tag: 'chat-message'
            });
        }
    } catch (error) {
        console.error('Error appending message:', error);
        showNotification('Failed to display message. Please refresh the page.');
    }
}

// User search
userSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const userItems = usersList.getElementsByClassName('user-item');
    
    Array.from(userItems).forEach(item => {
        const email = item.dataset.email.toLowerCase();
        item.style.display = email.includes(searchTerm) ? 'flex' : 'none';
    });
});

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Cleanup
window.addEventListener('unload', () => {
    if (currentChatId) {
        const messagesRef = ref(rtdb, `direct-messages/${currentChatId}/messages`);
        off(messagesRef);
    }
});

// Update the setupNotificationToggle function
function setupNotificationToggle() {
    const notificationToggle = document.createElement('button');
    notificationToggle.className = 'notification-toggle';
    updateNotificationToggleUI(notificationToggle);
    
    notificationToggle.addEventListener('click', async () => {
        if (notificationsEnabled) {
            notificationsEnabled = false;
            localStorage.setItem('notifications', 'false');
        } else {
            const granted = await notificationManager.requestPermission();
            if (granted) {
                notificationsEnabled = true;
                localStorage.setItem('notifications', 'true');
            }
        }
        updateNotificationToggleUI(notificationToggle);
    });

    // Add to chat header
    document.querySelector('.chat-header .encryption-badge').before(notificationToggle);
}

// Add this new helper function
function updateNotificationToggleUI(button) {
    button.innerHTML = `
        <i class="ri-notification-${notificationsEnabled ? 'fill' : 'off-line'}"></i>
        Notifications ${notificationsEnabled ? 'On' : 'Off'}
    `;
}
