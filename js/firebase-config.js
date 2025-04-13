import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD18aBadS0lWUFmy5OFAI2D9sAyfyP8IA8",
    authDomain: "xtsbetaprogram.firebaseapp.com",
    databaseURL: "https://xtsbetaprogram-default-rtdb.firebaseio.com",
    projectId: "xtsbetaprogram",
    storageBucket: "xtsbetaprogram.firebasestorage.app",
    messagingSenderId: "826429789847",
    appId: "1:826429789847:web:e27f4a6ddd8a6ab6597bd2",
    measurementId: "G-BB2KSJEZSN"
};

let auth;
let db;
let app;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

export { auth, db };
