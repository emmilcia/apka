import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your project's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB8tBsJEDdCAFLNGTDmOl0GjpjOLBMnqfA",
    authDomain: "apka-f6b19.firebaseapp.com",
    projectId: "apka-f6b19",
    storageBucket: "apka-f6b19.firebasestorage.app",
    messagingSenderId: "636199984361",
    appId: "1:636199984361:web:24b19f62575adabcc82478",
    measurementId: "G-F0QKNPKJNM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
