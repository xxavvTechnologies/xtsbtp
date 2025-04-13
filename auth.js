// Check if user is authenticated
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = '/login.html';
        }
    });
}

// Sign out function
function signOut() {
    firebase.auth().signOut().then(() => {
        window.location.href = '/login.html';
    });
}

// Check if user has invitation
async function checkInvitation(email) {
    const db = firebase.firestore();
    const invitationRef = await db.collection('invitations').doc(email).get();
    return invitationRef.exists;
}
