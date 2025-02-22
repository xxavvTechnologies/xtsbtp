import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD18aBadS0lWUFmy5OFAI2D9sAyfyP8IA8",
    authDomain: "xtsbetaprogram.firebaseapp.com",
    projectId: "xtsbetaprogram",
    storageBucket: "xtsbetaprogram.firebasestorage.app",
    messagingSenderId: "826429789847",
    appId: "1:826429789847:web:e27f4a6ddd8a6ab6597bd2",
    measurementId: "G-BB2KSJEZSN",
    databaseURL: "https://xtsbetaprogram-default-rtdb.firebaseio.com" // Add this line
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
