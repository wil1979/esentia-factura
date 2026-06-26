// modules/firebaseStorage.js
import { db, auth, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, serverTimestamp, signInAnonymously, onAuthStateChanged } from 'https://wil1979.github.io/esentia-factura/etiquetas/modules/firebase2.js';

// Nombre de la colección en Firestore
const COLLECTION_NAME = 'etiquetas_proyectos';

// Estado de autenticación
let currentUser = null;
let authReady = false;

// ===== INICIALIZAR AUTENTICACIÓN =====
export function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        authReady = true;
        console.log('✅ Usuario autenticado:', user.uid);
        resolve(user);
      } else {
        console.log('🔄 Iniciando sesión anónima...');
        try {
          const result = await signInAnonymously(auth);
          currentUser = result.user;
          authReady = true;
          console.log('✅ Sesión anónima iniciada:', currentUser.uid);
          resolve(currentUser);
        } catch (error) {
          console.error('❌ Error en autenticación anónima:', error);
          authReady = false;
          resolve(null);
        }
      }
    });
  });
}

// ===== ESPERAR A QUE AUTH ESTÉ LISTO =====
async function waitForAuth() {
  if (authReady && currentUser) return currentUser;
  
  return new Promise((resolve) => {
    const checkAuth = setInterval(() => {
      if (authReady && currentUser) {
        clearInterval(checkAuth);
        resolve(currentUser);
      }
    }, 100);
    
    // Timeout después de 5 segundos
    setTimeout(() => {
      clearInterval(checkAuth);
      resolve(null);
    }, 5000);
  });
}

// ===== GUARDAR PROYECTO EN FIRESTORE =====
export async function saveProjectToFirestore(project) {
  const user = await waitForAuth();
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }

  try {
    const projectData = {
      ...project,
      userId: user.uid,
      createdAt: project.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastModified: new Date().toISOString()
    };

    // Si el proyecto tiene ID, actualizar; si no, crear nuevo
    const projectRef = doc(db, COLLECTION_NAME, project.id.toString());
    await setDoc(projectRef, projectData, { merge: true });
    
    console.log('✅ Proyecto guardado en Firestore:', project.id);
    return projectData;
  } catch (error) {
    console.error('❌ Error al guardar en Firestore:', error);
    throw error;
  }
}

// ===== CARGAR TODOS LOS PROYECTOS DEL USUARIO =====
export async function loadProjectsFromFirestore() {
  const user = await waitForAuth();
  if (!user) {
    console.warn('⚠️ No hay usuario autenticado, devolviendo array vacío');
    return [];
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const projects = [];

    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ Proyectos cargados desde Firestore:', projects.length);
    return projects;
  } catch (error) {
    console.error('❌ Error al cargar desde Firestore:', error);
    throw error;
  }
}

// ===== CARGAR UN PROYECTO ESPECÍFICO =====
export async function loadProjectFromFirestore(projectId) {
  const user = await waitForAuth();
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }

  try {
    const projectRef = doc(db, COLLECTION_NAME, projectId.toString());
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      const data = projectSnap.data();
      
      // Verificar que el proyecto pertenece al usuario
      if (data.userId !== user.uid) {
        throw new Error('No tienes permiso para acceder a este proyecto');
      }

      console.log('✅ Proyecto cargado:', projectId);
      return {
        id: projectSnap.id,
        ...data
      };
    } else {
      throw new Error('Proyecto no encontrado');
    }
  } catch (error) {
    console.error('❌ Error al cargar proyecto:', error);
    throw error;
  }
}

// ===== ELIMINAR PROYECTO DE FIRESTORE =====
export async function deleteProjectFromFirestore(projectId) {
  const user = await waitForAuth();
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }

  try {
    // Primero verificar que el proyecto pertenece al usuario
    const projectRef = doc(db, COLLECTION_NAME, projectId.toString());
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      throw new Error('Proyecto no encontrado');
    }

    const data = projectSnap.data();
    if (data.userId !== user.uid) {
      throw new Error('No tienes permiso para eliminar este proyecto');
    }

    await deleteDoc(projectRef);
    console.log('✅ Proyecto eliminado de Firestore:', projectId);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar de Firestore:', error);
    throw error;
  }
}

// ===== SINCRONIZAR LOCALSTORAGE CON FIRESTORE =====
export async function syncProjects() {
  try {
    // Cargar proyectos desde Firestore
    const firestoreProjects = await loadProjectsFromFirestore();
    
    // Cargar proyectos desde localStorage
    const localProjects = JSON.parse(localStorage.getItem('aromaProjects') || '[]');
    
    // Crear mapa de proyectos por ID
    const allProjects = new Map();
    
    // Agregar proyectos locales
    localProjects.forEach(p => {
      allProjects.set(p.id.toString(), { ...p, source: 'local' });
    });
    
    // Agregar/actualizar con proyectos de Firestore
    firestoreProjects.forEach(p => {
      const existing = allProjects.get(p.id.toString());
      if (!existing || new Date(p.lastModified) > new Date(existing.lastModified || 0)) {
        allProjects.set(p.id.toString(), { ...p, source: 'firestore' });
      }
    });
    
    // Convertir mapa a array
    const mergedProjects = Array.from(allProjects.values());
    
    // Guardar en localStorage
    localStorage.setItem('aromaProjects', JSON.stringify(mergedProjects));
    
    console.log('✅ Sincronización completada:', mergedProjects.length, 'proyectos');
    return mergedProjects;
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    throw error;
  }
}

// ===== SUBIR PROYECTO LOCAL A FIRESTORE =====
export async function uploadLocalProjectToFirestore(project) {
  try {
    await saveProjectToFirestore(project);
    console.log('✅ Proyecto subido a Firestore:', project.id);
    return true;
  } catch (error) {
    console.error('❌ Error al subir proyecto:', error);
    throw error;
  }
}

// ===== VERIFICAR ESTADO DE CONEXIÓN =====
export function getConnectionStatus() {
  return {
    authenticated: authReady && currentUser !== null,
    userId: currentUser ? currentUser.uid : null,
    isAnonymous: currentUser ? currentUser.isAnonymous : false
  };
}

// ===== CERRAR SESIÓN =====
export async function logout() {
  try {
    await signOut(auth);
    currentUser = null;
    authReady = false;
    console.log('✅ Sesión cerrada');
    return true;
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    throw error;
  }
}