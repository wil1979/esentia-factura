// 🔥 Reemplaza estos valores con los de TU proyecto de Firebase
const firebaseConfig = {
      apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
      authDomain: "esentiacreditos-8345f.firebaseapp.com",
      projectId: "esentiacreditos-8345f",
      storageBucket: "esentiacreditos-8345f.firebasestorage.app",
      messagingSenderId: "888658236080",
      appId: "1:888658236080:web:506e5e2085b5a452dba175"
    };

// Inicializar Firebase
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
    import { getFirestore, collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);