// BUILD 02 — Conexión Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const config = {
  apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
  authDomain: "esentiacreditos-8345f.firebaseapp.com",
  projectId: "esentiacreditos-8345f",
  storageBucket: "esentiacreditos-8345f.firebasestorage.app",
  messagingSenderId: "888658236080",
  appId: "1:888658236080:web:506e5e2085b5a452dba175"
};

const app = initializeApp(config);

export const db = getFirestore(app);

export async function obtenerCapitulosPublicados() {
  const ref = collection(db, "capitulos");

  const q = query(
    ref,
    where("publicado", "==", true),
    orderBy("numero", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}