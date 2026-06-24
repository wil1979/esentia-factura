// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
    authDomain: "esentiacreditos-8345f.firebaseapp.com",
    projectId: "esentiacreditos-8345f",
    storageBucket: "esentiacreditos-8345f.firebasestorage.app",
    messagingSenderId: "888658236080",
    appId: "1:888658236080:web:506e5e2085b5a452dba175"
};

// ==================== ESTADO ====================
let participants = [];
let winners = [];
let isSpinning = false;
let db = null;
let storage = null;
let currentRotation = 0;
let currentGroupId = null;
let groups = [];
let currentEditingId = null;
let currentImageBase64 = null;
let currentImageUrl = null;
let imageTabActive = 'file';
let editingGroupId = null;
let isOnline = navigator.onLine;
let isFirebaseReady = false;
let pendingSyncWinners = [];

// ==================== COSTOS CERA ====================
const costosCera = {
    cera_china: 1000,
    cera_soya: 2500,
    cera_abeja: 4000,
    parafina_gel: 3000,
    cera_coco: 3500
};

// ==================== INICIALIZACION ====================
document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    setupNetworkListeners();
    loadOfflineData();

    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();

        await db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
                console.log('Persistencia offline habilitada');
                showToast('Persistencia offline activada', false, 'info');
            })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Persistencia: multiples pestanas abiertas');
                } else if (err.code === 'unimplemented') {
                    console.warn('Navegador no soporta persistencia offline');
                    showToast('Tu navegador no soporta modo offline', true);
                }
            });

        isFirebaseReady = true;
        console.log('Firebase conectado');

        if (isOnline) {
            await syncPendingWinners();
            await loadGroups();
        } else {
            renderGroupSelector();
            renderAdminGroups();
            if (currentGroupId) {
                loadGroupFromLocal(currentGroupId);
            }
            showToast('Modo Offline - Usando datos locales', false, 'warning');
        }

        cargarHistorialCalculadora();
    } catch (e) {
        console.error('Error Firebase:', e);
        isFirebaseReady = false;
        showToast('Error conectando Firebase - Modo Offline activo', true);
        renderGroupSelector();
        renderAdminGroups();
        if (currentGroupId) {
            loadGroupFromLocal(currentGroupId);
        }
    }

    const calcModalOverlay = document.getElementById('calcModalOverlay');
    if (calcModalOverlay) {
        calcModalOverlay.addEventListener('click', function (e) {
            if (e.target === this) cerrarCalculadora();
        });
    }

    const calcTipoCera = document.getElementById('calcTipoCera');
    if (calcTipoCera) {
        calcTipoCera.addEventListener('change', function () {
            const tipo = this.value;
            if (tipo !== 'personalizado' && costosCera[tipo]) {
                const costoCeraInput = document.getElementById('calcCostoCera');
                if (costoCeraInput) costoCeraInput.value = costosCera[tipo];
                calcularProduccion();
            }
        });
    }

    ['calcPesoVela', 'calcPorcentajeFragancia', 'calcCostoCera', 'calcCostoFragancia',
     'calcCostoMecheEnvase', 'calcCostosIndirectos', 'calcManoObra', 'calcMargenGanancia']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', calcularProduccion);
        });

    document.getElementById('loadingOverlay').classList.add('hidden');
});

// ==================== DETECCION DE CONEXION ====================
function setupNetworkListeners() {
    window.addEventListener('online', async () => {
        isOnline = true;
        updateConnectionStatus();
        showToast('Conexion restaurada - Sincronizando...', false, 'info');
        if (isFirebaseReady) {
            await syncPendingWinners();
            await loadGroups();
            cargarHistorialCalculadora();
        }
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateConnectionStatus();
        showToast('Sin conexion - Modo Offline activo', false, 'warning');
    });

    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    const offlineIndicator = document.getElementById('offlineIndicator');

    if (isOnline) {
        if (statusEl) {
            statusEl.className = 'ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400';
            statusEl.innerHTML = '● Online';
        }
        if (offlineIndicator) offlineIndicator.classList.remove('active');
    } else {
        if (statusEl) {
            statusEl.className = 'ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400';
            statusEl.innerHTML = '● Offline';
        }
        if (offlineIndicator) offlineIndicator.classList.add('active');
    }
}

// ==================== LOCAL STORAGE ====================
function saveToLocal(key, data) {
    try {
        localStorage.setItem('esentia_' + key, JSON.stringify(data));
    } catch (e) {
        console.error('Error guardando en localStorage:', e);
    }
}

function loadFromLocal(key) {
    try {
        const data = localStorage.getItem('esentia_' + key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error cargando desde localStorage:', e);
        return null;
    }
}

function loadOfflineData() {
    const localGroups = loadFromLocal('groups');
    if (localGroups && localGroups.length > 0) {
        groups = localGroups;
    }

    const localWinners = loadFromLocal('winners');
    if (localWinners) {
        winners = localWinners;
    }

    const savedGroupId = loadFromLocal('currentGroupId');
    if (savedGroupId) {
        currentGroupId = savedGroupId;
    }

    const localParticipants = loadFromLocal('participants');
    if (localParticipants) {
        participants = localParticipants;
    }

    const pending = loadFromLocal('pendingSyncWinners');
    if (pending && pending.length > 0) {
        pendingSyncWinners = pending;
    }
}

function saveGroupToLocal(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const groupWinners = winners.filter(w => w.grupoId === groupId);
    const winnerNames = new Set(groupWinners.map(w => w.nombre.toUpperCase().trim()));
    const groupParticipants = (group.participantes || [])
        .filter(p => !winnerNames.has(p.nombre.toUpperCase().trim()))
        .map(p => ({ ...p }));

    saveToLocal('participants_' + groupId, groupParticipants);
    saveToLocal('winners_' + groupId, groupWinners);
    saveToLocal('currentGroupId', groupId);
}

function loadGroupFromLocal(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const localParticipants = loadFromLocal('participants_' + groupId);
    const localWinners = loadFromLocal('winners_' + groupId);

    if (localParticipants) {
        participants = localParticipants;
    } else {
        participants = (group.participantes || []).map(p => ({ ...p }));
    }

    if (localWinners) {
        winners = localWinners;
    } else {
        winners = [];
    }

    document.getElementById('totalCount').textContent = group.participantes?.length || 0;
    updateUI();
    renderWheel();
    checkResetButton();
}

// ==================== SINCRONIZACION ====================
async function syncPendingWinners() {
    if (!db || !isOnline || pendingSyncWinners.length === 0) return;

    const syncIndicator = document.getElementById('syncIndicator');
    const syncText = document.getElementById('syncText');

    if (syncIndicator) {
        syncIndicator.className = 'sync-indicator syncing active';
        syncText.textContent = 'Sincronizando ' + pendingSyncWinners.length + ' ganador(es)...';
    }

    const synced = [];
    const failed = [];

    for (const winner of pendingSyncWinners) {
        try {
            await db.collection('premios').add({
                nombre: winner.nombre,
                departamento: winner.departamento || '',
                fecha: winner.fecha,
                posicion: winner.posicion,
                grupoId: winner.grupoId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                syncedFromOffline: true
            });
            synced.push(winner);
        } catch (e) {
            console.error('Error sincronizando ganador:', e);
            failed.push(winner);
        }
    }

    pendingSyncWinners = failed;
    saveToLocal('pendingSyncWinners', pendingSyncWinners);

    if (syncIndicator) {
        if (failed.length === 0) {
            syncIndicator.className = 'sync-indicator synced active';
            syncText.textContent = String.fromCodePoint(10003) + ' ' + synced.length + ' ganador(es) sincronizado(s)';
            setTimeout(() => syncIndicator.classList.remove('active'), 3000);
            showToast(String.fromCodePoint(9989) + ' ' + synced.length + ' ganador(es) sincronizado(s) con Firestore');
        } else {
            syncIndicator.className = 'sync-indicator syncing active';
            syncText.textContent = String.fromCodePoint(9888) + ' ' + failed.length + ' pendiente(s)';
            showToast(String.fromCodePoint(9888) + ' ' + failed.length + ' ganador(es) no pudieron sincronizarse', true);
        }
    }
}

function queueWinnerForSync(winner) {
    pendingSyncWinners.push(winner);
    saveToLocal('pendingSyncWinners', pendingSyncWinners);
}

// ==================== GESTION DE GRUPOS ====================
async function loadGroups() {
    if (!db) {
        renderGroupSelector();
        renderAdminGroups();
        return;
    }

    try {
        const snapshot = await db.collection('participantes_ruleta').get();
        groups = [];
        snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));

        saveToLocal('groups', groups);

        renderGroupSelector();
        renderAdminGroups();

        if (currentGroupId) {
            await loadWinnersFromFirestore();
        }
    } catch (e) {
        console.error('Error cargando grupos:', e);
        showToast('Error cargando grupos - Usando datos locales', true);
        renderGroupSelector();
        renderAdminGroups();
    }
}

function renderGroupSelector() {
    const selector = document.getElementById('groupSelector');
    const currentVal = selector.value;
    selector.innerHTML = '<option value="">Selecciona un grupo...</option>';

    groups.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.nombre + ' (' + (g.participantes?.length || 0) + ')';
        selector.appendChild(option);
    });

    if (currentVal && groups.find(g => g.id === currentVal)) {
        selector.value = currentVal;
    } else if (groups.length > 0 && !currentVal) {
        selector.value = groups[0].id;
        changeGroup();
    }
}

async function changeGroup() {
    const selector = document.getElementById('groupSelector');
    currentGroupId = selector.value;

    if (!currentGroupId) {
        participants = [];
        winners = [];
        updateUI();
        renderWheel();
        return;
    }

    saveToLocal('currentGroupId', currentGroupId);

    if (isOnline && db) {
        await loadWinnersFromFirestore();
    } else {
        loadGroupFromLocal(currentGroupId);
    }
}

function openAdmin() {
    document.getElementById('adminOverlay').classList.add('active');
    renderAdminGroups();
}

function closeAdmin() {
    document.getElementById('adminOverlay').classList.remove('active');
    editingGroupId = null;
}

// ===== CREAR NUEVO GRUPO =====
async function createNewGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    const desc = document.getElementById('newGroupDesc').value.trim();
    const participantsText = document.getElementById('newGroupParticipants').value.trim();

    if (!name) { showToast('El nombre del grupo es obligatorio', true); return; }
    if (!participantsText) { showToast('Debes agregar al menos un participante', true); return; }

    const participantList = participantsText.split(/[\r\n,]+/)
        .map(p => p.trim())
        .filter(p => p !== '')
        .map((p, index) => ({
            id: Date.now().toString() + index,
            nombre: p.toUpperCase(),
            departamento: desc || 'General'
        }));

    const newGroup = {
        nombre: name,
        descripcion: desc,
        participantes: participantList,
        createdAt: new Date().toISOString()
    };

    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');

        if (isOnline && db) {
            const docRef = await db.collection('participantes_ruleta').add({
                ...newGroup,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            newGroup.id = docRef.id;
            groups.push(newGroup);
        } else {
            newGroup.id = 'local_' + Date.now();
            groups.push(newGroup);
            saveToLocal('groups', groups);
            showToast('Grupo creado localmente (se sincronizara al conectar)');
        }

        document.getElementById('newGroupName').value = '';
        document.getElementById('newGroupDesc').value = '';
        document.getElementById('newGroupParticipants').value = '';

        renderGroupSelector();
        renderAdminGroups();
    } catch (e) {
        console.error('Error creando grupo:', e);
        showToast('Error al crear el grupo', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// ===== ELIMINAR GRUPO =====
async function deleteGroup(id) {
    if (!confirm('Estas seguro de eliminar este grupo? Esta accion no se puede deshacer.')) return;

    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');

        if (isOnline && db) {
            await db.collection('participantes_ruleta').doc(id).delete();
            const snapshot = await db.collection('premios').where('grupoId', '==', id).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        groups = groups.filter(g => g.id !== id);
        saveToLocal('groups', groups);
        localStorage.removeItem('esentia_participants_' + id);
        localStorage.removeItem('esentia_winners_' + id);

        showToast('Grupo eliminado');
        renderGroupSelector();
        renderAdminGroups();

        if (currentGroupId === id) {
            currentGroupId = null;
            document.getElementById('groupSelector').value = '';
            participants = [];
            winners = [];
            updateUI();
            renderWheel();
            checkResetButton();
            saveToLocal('currentGroupId', null);
        }
    } catch (e) {
        console.error('Error eliminando grupo:', e);
        showToast('Error al eliminar el grupo', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// ===== EDITAR GRUPO =====
function toggleEditGroup(id) {
    const form = document.getElementById('editForm-' + id);
    const isActive = form.classList.contains('active');

    document.querySelectorAll('.group-edit-form').forEach(f => f.classList.remove('active'));

    if (!isActive) {
        form.classList.add('active');
        const group = groups.find(g => g.id === id);
        if (group) {
            document.getElementById('editName-' + id).value = group.nombre;
            document.getElementById('editDesc-' + id).value = group.descripcion || '';
        }
    }
}

async function saveGroupEdit(id) {
    const nombre = document.getElementById('editName-' + id).value.trim();
    const descripcion = document.getElementById('editDesc-' + id).value.trim();

    if (!nombre) { showToast('El nombre del grupo es obligatorio', true); return; }

    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');

        if (isOnline && db) {
            await db.collection('participantes_ruleta').doc(id).update({
                nombre: nombre,
                descripcion: descripcion,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        const groupIndex = groups.findIndex(g => g.id === id);
        if (groupIndex !== -1) {
            groups[groupIndex].nombre = nombre;
            groups[groupIndex].descripcion = descripcion;
            saveToLocal('groups', groups);
        }

        showToast('Grupo actualizado');
        renderGroupSelector();
        renderAdminGroups();
        document.getElementById('editForm-' + id).classList.remove('active');
    } catch (e) {
        console.error('Error actualizando grupo:', e);
        showToast('Error al actualizar el grupo', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// ===== PARTICIPANTES =====
function toggleParticipants(id) {
    const list = document.getElementById('participants-' + id);
    const icon = document.getElementById('expandIcon-' + id);
    list.classList.toggle('active');
    icon.style.transform = list.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
}

async function addParticipant(groupId) {
    const input = document.getElementById('newParticipant-' + groupId);
    const nombre = input.value.trim().toUpperCase();

    if (!nombre) { showToast('Ingresa un nombre', true); return; }

    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const existe = group.participantes?.some(p => p.nombre.toUpperCase() === nombre);
    if (existe) { showToast('Este participante ya existe', true); return; }

    const nuevoParticipante = {
        id: Date.now().toString(),
        nombre: nombre,
        departamento: group.descripcion || 'General'
    };

    const nuevosParticipantes = [...(group.participantes || []), nuevoParticipante];

    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');

        if (isOnline && db) {
            await db.collection('participantes_ruleta').doc(groupId).update({
                participantes: nuevosParticipantes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        group.participantes = nuevosParticipantes;
        saveToLocal('groups', groups);
        input.value = '';
        showToast(nombre + ' agregado');
        renderAdminGroups();

        setTimeout(() => {
            const list = document.getElementById('participants-' + groupId);
            if (list) list.classList.add('active');
        }, 100);
    } catch (e) {
        console.error('Error agregando participante:', e);
        showToast('Error al agregar participante', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

async function deleteParticipant(groupId, participantId) {
    if (!confirm('Eliminar este participante?')) return;

    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const nuevosParticipantes = group.participantes.filter(p => p.id !== participantId);

    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');

        if (isOnline && db) {
            await db.collection('participantes_ruleta').doc(groupId).update({
                participantes: nuevosParticipantes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        group.participantes = nuevosParticipantes;
        saveToLocal('groups', groups);
        showToast('Participante eliminado');
        renderAdminGroups();

        setTimeout(() => {
            const list = document.getElementById('participants-' + groupId);
            if (list) list.classList.add('active');
        }, 100);
    } catch (e) {
        console.error('Error eliminando participante:', e);
        showToast('Error al eliminar participante', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function enableParticipantEdit(groupId, participantId) {
    const input = document.getElementById('participant-input-' + groupId + '-' + participantId);
    const actions = document.getElementById('participant-actions-' + groupId + '-' + participantId);
    input.readOnly = false;
    input.focus();
    input.style.borderBottom = '1px solid #0ea5e9';
    actions.innerHTML = `
        <button onclick="saveParticipantEdit('${groupId}', '${participantId}')" title="Guardar">✓</button>
        <button onclick="cancelParticipantEdit('${groupId}', '${participantId}')" title="Cancelar">✕</button>
    `;
}

async function saveParticipantEdit(groupId, participantId) {
    const input = document.getElementById('participant-input-' + groupId + '-' + participantId);
    const nuevoNombre = input.value.trim().toUpperCase();

    if (!nuevoNombre) { showToast('El nombre no puede estar vacio', true); return; }

    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const existe = group.participantes?.some(p => p.id !== participantId && p.nombre.toUpperCase() === nuevoNombre);
    if (existe) { showToast('Ya existe un participante con ese nombre', true); return; }

    const nuevosParticipantes = group.participantes.map(p => {
        if (p.id === participantId) return { ...p, nombre: nuevoNombre };
        return p;
    });

    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');

        if (isOnline && db) {
            await db.collection('participantes_ruleta').doc(groupId).update({
                participantes: nuevosParticipantes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        group.participantes = nuevosParticipantes;
        saveToLocal('groups', groups);
        showToast('Participante actualizado');
        renderAdminGroups();

        setTimeout(() => {
            const list = document.getElementById('participants-' + groupId);
            if (list) list.classList.add('active');
        }, 100);
    } catch (e) {
        console.error('Error actualizando participante:', e);
        showToast('Error al actualizar participante', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function cancelParticipantEdit(groupId, participantId) {
    const group = groups.find(g => g.id === groupId);
    const participant = group?.participantes?.find(p => p.id === participantId);

    if (participant) {
        const input = document.getElementById('participant-input-' + groupId + '-' + participantId);
        input.value = participant.nombre;
        input.readOnly = true;
        input.style.borderBottom = 'none';

        const actions = document.getElementById('participant-actions-' + groupId + '-' + participantId);
        actions.innerHTML = `
            <button onclick="enableParticipantEdit('${groupId}', '${participantId}')" title="Editar">
                <span style="color:#f59e0b">✎</span>
            </button>
            <button onclick="deleteParticipant('${groupId}', '${participantId}')" class="btn-delete-part" title="Eliminar">
                <span style="color:#ef4444">🗑</span>
            </button>
        `;
    }
}

// ===== RENDER ADMIN GROUPS =====
function renderAdminGroups() {
    const list = document.getElementById('adminGroupsList');

    if (groups.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 py-8">No hay grupos creados aun.</p>';
        return;
    }

    let html = '<h3 class="text-xl font-bold mb-4">Grupos Existentes</h3>';

    groups.forEach(g => {
        const participantCount = g.participantes?.length || 0;
        html += `
            <div class="group-card" id="group-card-${g.id}">
                <div class="group-card-header">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">👥</div>
                        <div>
                            <p class="group-card-title">${g.nombre}</p>
                            <p class="text-xs text-slate-400">${g.descripcion || 'Sin descripcion'} - <span class="badge-count">${participantCount} participantes</span></p>
                        </div>
                    </div>
                    <div class="group-card-actions">
                        <button onclick="toggleEditGroup('${g.id}')" class="btn-edit" title="Editar grupo">
                            <span style="color:#f59e0b">✎</span>
                        </button>
                        <button onclick="deleteGroup('${g.id}')" class="btn-delete" title="Eliminar grupo">
                            <span style="color:#ef4444">🗑</span>
                        </button>
                        <button onclick="toggleParticipants('${g.id}')" class="btn-expand" title="Ver participantes" id="expandIcon-${g.id}">▼</button>
                    </div>
                </div>
                <div class="group-edit-form" id="editForm-${g.id}">
                    <input type="text" id="editName-${g.id}" placeholder="Nombre del grupo">
                    <input type="text" id="editDesc-${g.id}" placeholder="Descripcion">
                    <div class="edit-actions">
                        <button class="btn-cancel" onclick="toggleEditGroup('${g.id}')">Cancelar</button>
                        <button class="btn-save" onclick="saveGroupEdit('${g.id}')">Guardar Cambios</button>
                    </div>
                </div>
                <div class="participant-list" id="participants-${g.id}">
                    ${g.participantes?.map(p => `
                        <div class="participant-item">
                            <input type="text" id="participant-input-${g.id}-${p.id}" value="${p.nombre}" readonly
                                onkeydown="if(event.key==='Enter') saveParticipantEdit('${g.id}', '${p.id}')"
                                onblur="setTimeout(() => cancelParticipantEdit('${g.id}', '${p.id}'), 200)">
                            <div class="participant-actions" id="participant-actions-${g.id}-${p.id}">
                                <button onclick="enableParticipantEdit('${g.id}', '${p.id}')" title="Editar">
                                    <span style="color:#f59e0b">✎</span>
                                </button>
                                <button onclick="deleteParticipant('${g.id}', '${p.id}')" class="btn-delete-part" title="Eliminar">
                                    <span style="color:#ef4444">🗑</span>
                                </button>
                            </div>
                        </div>
                    `).join('') || '<p class="text-sm text-slate-500 text-center py-2">Sin participantes</p>'}
                    <div class="add-participant-row">
                        <input type="text" id="newParticipant-${g.id}" placeholder="Nuevo participante..." onkeydown="if(event.key==='Enter') addParticipant('${g.id}')">
                        <button onclick="addParticipant('${g.id}')">+ Agregar</button>
                    </div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

// ==================== PARTICULAS ====================
function createParticles() {
    const container = document.getElementById('particles');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        const size = Math.random() * 6 + 2;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.animationDuration = (Math.random() * 10 + 8) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        fragment.appendChild(p);
    }

    container.appendChild(fragment);
}

// ==================== TOAST ====================
function showToast(message, isError = false, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast';
    if (isError) toast.classList.add('error');
    else if (type === 'warning') toast.classList.add('warning');
    else if (type === 'info') toast.classList.add('info');

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== GANADORES ====================
async function loadWinnersFromFirestore() {
    if (!db || !currentGroupId) return;

    try {
        const snapshot = await db.collection('premios')
            .where('grupoId', '==', currentGroupId)
            .orderBy('posicion', 'asc')
            .get();

        const firestoreWinners = [];
        snapshot.forEach(doc => firestoreWinners.push({ ...doc.data(), firestoreId: doc.id }));

        const currentGroup = groups.find(g => g.id === currentGroupId);
        if (!currentGroup) return;

        if (firestoreWinners.length > 0) {
            winners = firestoreWinners.map(w => ({
                id: w.id || '',
                nombre: w.nombre,
                departamento: w.departamento || '',
                posicion: w.posicion,
                fecha: w.fecha || '',
                firestoreId: w.firestoreId,
                grupoId: currentGroupId
            }));

            const winnerNames = new Set(winners.map(w => w.nombre.toUpperCase().trim()));
            participants = (currentGroup.participantes || [])
                .filter(p => !winnerNames.has(p.nombre.toUpperCase().trim()))
                .map(p => ({ ...p }));

            showToast(String.fromCodePoint(128203) + ' ' + winners.length + ' ganador(es) cargado(s)');
        } else {
            participants = (currentGroup.participantes || []).map(p => ({ ...p }));
            winners = [];
        }

        saveGroupToLocal(currentGroupId);

        document.getElementById('totalCount').textContent = currentGroup.participantes?.length || 0;
        updateUI();
        renderWheel();
        checkResetButton();
    } catch (e) {
        console.error('Error cargando ganadores:', e);
        showToast('Error cargando datos - Usando locales', true);
        loadGroupFromLocal(currentGroupId);
    }
}

async function saveWinnerToFirestore(winner) {
    if (!currentGroupId) { showToast('Grupo no seleccionado', true); return false; }
    saveGroupToLocal(currentGroupId);

    if (!isOnline || !db) {
        queueWinnerForSync(winner);
        showToast('Ganador guardado localmente (se sincronizara al conectar)');
        return true;
    }

    try {
        await db.collection('premios').add({
            nombre: winner.nombre,
            departamento: winner.departamento || '',
            fecha: winner.fecha,
            posicion: winner.posicion,
            grupoId: currentGroupId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error('Error guardando en Firestore:', e);
        queueWinnerForSync(winner);
        showToast('Error de red - Ganador guardado localmente', true);
        return false;
    }
}

async function archiveAndClearFirestore() {
    if (!currentGroupId) return false;

    try {
        const currentGroup = groups.find(g => g.id === currentGroupId);
        const sortedWinners = [...winners].sort((a, b) => a.posicion - b.posicion);

        if (isOnline && db) {
            await db.collection('premios_historial').add({
                grupoId: currentGroupId,
                grupoNombre: currentGroup?.nombre || 'Desconocido',
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                totalGanadores: winners.length,
                ganadores: sortedWinners.map(w => ({
                    nombre: w.nombre,
                    departamento: w.departamento,
                    posicion: w.posicion,
                    fecha: w.fecha
                }))
            });

            const snapshot = await db.collection('premios').where('grupoId', '==', currentGroupId).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        localStorage.removeItem('esentia_participants_' + currentGroupId);
        localStorage.removeItem('esentia_winners_' + currentGroupId);

        return true;
    } catch (e) {
        console.error('Error archivando:', e);
        showToast('Error archivando datos', true);
        return false;
    }
}

// ==================== RULETA ====================
function renderWheel() {
    const svg = document.getElementById('wheelSVG');
    svg.innerHTML = '';

    const count = participants.length;
    if (count === 0) return;

    const cx = 240, cy = 240, radius = 220;
    const angleStep = (2 * Math.PI) / count;
    const colors = ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#155e75', '#164e63', '#1e3a5f', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6'];

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'textShadow');
    filter.innerHTML = '<feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="black" flood-opacity="0.8"/>';
    defs.appendChild(filter);
    svg.appendChild(defs);

    participants.forEach((p, i) => {
        const startAngle = i * angleStep - Math.PI / 2;
        const endAngle = startAngle + angleStep;
        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);
        const largeArc = angleStep > Math.PI ? 1 : 0;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`);
        path.setAttribute('fill', colors[i % colors.length]);
        path.setAttribute('stroke', 'rgba(255,255,255,0.15)');
        path.setAttribute('stroke-width', '1');
        svg.appendChild(path);

        const midAngle = startAngle + angleStep / 2;
        const textRadius = radius * 0.65;
        const textX = cx + textRadius * Math.cos(midAngle);
        const textY = cy + textRadius * Math.sin(midAngle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', textX);
        text.setAttribute('y', textY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', count > 20 ? '10' : '13');
        text.setAttribute('font-weight', '800');
        text.setAttribute('filter', 'url(#textShadow)');

        let rotation = (midAngle * 180 / Math.PI);
        if (rotation > 90 && rotation < 270) rotation += 180;

        text.setAttribute('transform', `rotate(${rotation}, ${textX}, ${textY})`);
        text.textContent = p.nombre;
        svg.appendChild(text);
    });

    const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerCircle.setAttribute('cx', cx);
    outerCircle.setAttribute('cy', cy);
    outerCircle.setAttribute('r', radius);
    outerCircle.setAttribute('fill', 'none');
    outerCircle.setAttribute('stroke', 'rgba(255,255,255,0.2)');
    outerCircle.setAttribute('stroke-width', '3');
    svg.appendChild(outerCircle);
}

function spinWheel() {
    if (isSpinning || participants.length === 0) return;
    if (participants.length === 1) { selectWinner(0); return; }

    isSpinning = true;
    const btn = document.getElementById('spinBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '⟳  GIRANDO...'; }

    const svg = document.getElementById('wheelSVG');
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const count = participants.length;
    const angleStep = 360 / count;
    const segmentCenterAngle = winnerIndex * angleStep + (angleStep / 2);
    const targetRotation = 360 - segmentCenterAngle;
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = currentRotation + (spins * 360) + targetRotation - (currentRotation % 360);
    const duration = 4500 + Math.random() * 1500;
    const startTime = performance.now();
    const startRotation = currentRotation;
    const totalRotation = finalRotation - startRotation;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        currentRotation = startRotation + (totalRotation * eased);
        svg.style.transform = 'rotate(' + currentRotation + 'deg)';

        if (progress < 1) requestAnimationFrame(animate);
        else setTimeout(() => selectWinner(winnerIndex), 400);
    }

    requestAnimationFrame(animate);
}

async function selectWinner(index) {
    const winner = participants[index];
    const now = new Date();
    const fechaStr = now.toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const winnerData = {
        ...winner,
        posicion: winners.length + 1,
        fecha: fechaStr,
        timestamp: now.toISOString(),
        grupoId: currentGroupId
    };

    await saveWinnerToFirestore(winnerData);
    winners.unshift(winnerData);
    participants.splice(index, 1);

    document.getElementById('winnerName').textContent = winner.nombre;
    document.getElementById('winnerDate').textContent = fechaStr;
    document.getElementById('winnerAvatar').textContent = winner.nombre.charAt(0).toUpperCase();
    document.getElementById('winnerOverlay').classList.add('active');

    launchConfetti();
    updateUI();
    renderWheel();
    checkResetButton();
    isSpinning = false;

    const btn = document.getElementById('spinBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = '▶  GIRAR'; }
}

function closeWinner() {
    document.getElementById('winnerOverlay').classList.remove('active');
    if (participants.length === 0) {
        setTimeout(() => showToast('Fiesta ' + String.fromCodePoint(127881) + ' Sorteo completado!'), 300);
    }
}

function updateUI() {
    document.getElementById('remainingCount').textContent = participants.length;
    document.getElementById('winnersCount').textContent = winners.length;
    document.getElementById('winnersCount2').textContent = winners.length;
    document.getElementById('sorteoNum').textContent = winners.length + 1;

    const totalParticipants = parseInt(document.getElementById('totalCount').textContent) || 1;
    const percent = (winners.length / totalParticipants) * 100;
    const circumference = 2 * Math.PI * 34;
    const offset = circumference - (percent / 100) * circumference;

    const progressCircle = document.getElementById('progressCircle');
    if (progressCircle) progressCircle.style.strokeDashoffset = offset;

    const progressPercent = document.getElementById('progressPercent');
    if (progressPercent) progressPercent.textContent = Math.round(percent) + '%';

    const list = document.getElementById('winnersList');
    if (winners.length === 0) {
        list.innerHTML = `
            <div class="text-center text-slate-500 py-12">
                <div class="text-5xl mb-4 opacity-30">🎁</div>
                <p class="text-sm">Gira la ruleta para comenzar.</p>
            </div>
        `;
        return;
    }

    const sortedWinners = [...winners].sort((a, b) => a.posicion - b.posicion);
    list.innerHTML = sortedWinners.map((w) => {
        const rankClass = w.posicion === 1 ? 'gold' : w.posicion === 2 ? 'silver' : w.posicion === 3 ? 'bronze' : '';
        return `
            <div class="winner-item">
                <div class="winner-rank ${rankClass}">${w.posicion}</div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-white truncate text-base">${w.nombre}</p>
                    <p class="text-xs text-slate-400">${w.departamento || ''} - ${w.fecha}</p>
                </div>
                <span class="text-2xl text-amber-400 ${w.posicion === 1 ? '' : 'opacity-0'}">👑</span>
            </div>
        `;
    }).join('');
}

function checkResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;

    const totalParticipants = parseInt(document.getElementById('totalCount').textContent) || 0;

    if (currentGroupId && totalParticipants > 0) {
        resetBtn.disabled = false;
        resetBtn.innerHTML = winners.length > 0 ? '↻  Reiniciar Sorteo' : '↻  Reiniciar';
    } else {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '🔒  Selecciona un grupo';
    }
}

async function resetAll() {
    if (!currentGroupId) { showToast('Selecciona un grupo primero', true); return; }
    if (!confirm('Reiniciar el sorteo? Los ganadores actuales se archivaran y todos los participantes volveran a estar disponibles.')) return;

    document.getElementById('loadingOverlay').classList.remove('hidden');

    try {
        if (winners.length > 0) await archiveAndClearFirestore();

        const currentGroup = groups.find(g => g.id === currentGroupId);
        if (currentGroup) {
            participants = (currentGroup.participantes || []).map(p => ({ ...p }));
            winners = [];
            currentRotation = 0;
            document.getElementById('totalCount').textContent = currentGroup.participantes?.length || 0;
            saveGroupToLocal(currentGroupId);
            updateUI();
            renderWheel();
            checkResetButton();
            showToast('Sorteo reiniciado. Todos los participantes disponibles.');
        }
    } catch (e) {
        console.error('Error reiniciando:', e);
        showToast('Error al reiniciar', true);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#0ea5e9', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#fbbf24'];

    for (let i = 0; i < 200; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 25,
            vy: (Math.random() - 0.5) * 25 - 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 12,
            life: 1,
            decay: 0.004 + Math.random() * 0.008
        });
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach(p => {
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.25;
            p.rotation += p.rotationSpeed;
            p.life -= p.decay;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        if (alive) requestAnimationFrame(animateConfetti);
    }

    animateConfetti();
}

window.addEventListener('resize', () => {
    const canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => console.log('SW no disponible'));
}

// ==================== CALCULADORA DE PRODUCCION ====================
function abrirCalculadora() {
    const modal = document.getElementById('calcModalOverlay');
    if (modal) {
        modal.classList.add('active');
        calcularProduccion();
    }
}

function cerrarCalculadora() {
    const modal = document.getElementById('calcModalOverlay');
    if (modal) modal.classList.remove('active');
}

// ===== GESTION DE IMAGENES =====
function cambiarTabImagen(tab) {
    imageTabActive = tab;
    document.querySelectorAll('.calc-imagen-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.calc-imagen-tab[data-tab="' + tab + '"]').classList.add('active');

    if (tab === 'file') {
        document.getElementById('calcImagenFileSection').style.display = 'block';
        document.getElementById('calcImagenUrlSection').style.display = 'none';
    } else {
        document.getElementById('calcImagenFileSection').style.display = 'none';
        document.getElementById('calcImagenUrlSection').style.display = 'block';
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen no debe superar 2MB', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        currentImageBase64 = e.target.result;
        currentImageUrl = null;
        mostrarPreviewImagen(currentImageBase64);
    };
    reader.readAsDataURL(file);
}

function handleUrlImagen() {
    const url = document.getElementById('calcImagenUrlInput').value.trim();
    if (!url) { showToast('Ingresa una URL valida', true); return; }

    currentImageUrl = url;
    currentImageBase64 = null;
    mostrarPreviewImagen(url);
}

function mostrarPreviewImagen(src) {
    const preview = document.getElementById('calcImagenPreview');
    if (preview) {
        preview.src = src;
        preview.style.display = 'block';
        preview.classList.remove('empty');
        preview.innerHTML = '';
    }

    const removeBtn = document.getElementById('calcImagenRemove');
    if (removeBtn) removeBtn.style.display = 'block';
}

function removerImagen() {
    currentImageBase64 = null;
    currentImageUrl = null;

    const preview = document.getElementById('calcImagenPreview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
        preview.classList.add('empty');
        preview.innerHTML = '🖼️';
    }

    const fileInput = document.getElementById('calcImagenFile');
    if (fileInput) fileInput.value = '';

    const urlInput = document.getElementById('calcImagenUrlInput');
    if (urlInput) urlInput.value = '';

    const removeBtn = document.getElementById('calcImagenRemove');
    if (removeBtn) removeBtn.style.display = 'none';
}

function calcularProduccion() {
    const pesoVela = parseFloat(document.getElementById('calcPesoVela')?.value) || 0;
    let porcentajeFragancia = parseFloat(document.getElementById('calcPorcentajeFragancia')?.value) || 0;
    const costoCeraKg = parseFloat(document.getElementById('calcCostoCera')?.value) || 0;
    const costoFraganciaKg = parseFloat(document.getElementById('calcCostoFragancia')?.value) || 0;
    const costoMecheEnvase = parseFloat(document.getElementById('calcCostoMecheEnvase')?.value) || 0;
    const costosIndirectos = parseFloat(document.getElementById('calcCostosIndirectos')?.value) || 0;
    const manoObra = parseFloat(document.getElementById('calcManoObra')?.value) || 0;
    const margenGanancia = parseFloat(document.getElementById('calcMargenGanancia')?.value) || 0;

    if (porcentajeFragancia > 100) {
        const input = document.getElementById('calcPorcentajeFragancia');
        if (input) input.value = 100;
        porcentajeFragancia = 100;
    }

    const pesoVelaKg = pesoVela / 1000;
    const pesoFraganciaKg = pesoVelaKg * (porcentajeFragancia / 100);
    const pesoCeraKg = pesoVelaKg - pesoFraganciaKg;

    const costoCeraTotal = pesoCeraKg * costoCeraKg;
    const costoFraganciaTotal = pesoFraganciaKg * costoFraganciaKg;
    const costoTotal = costoCeraTotal + costoFraganciaTotal + costoMecheEnvase + costosIndirectos + manoObra;
    const gananciaVela = costoTotal * (margenGanancia / 100);
    const precioVenta = costoTotal + gananciaVela;

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('calcPesoFraganciaTotal', (pesoFraganciaKg * 1000).toFixed(1) + 'g');
    setText('calcCostoCeraTotal', '₡' + costoCeraTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoFraganciaTotal', '₡' + costoFraganciaTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoMecheEnvaseTotal', '₡' + costoMecheEnvase.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostosIndirectosTotal', '₡' + costosIndirectos.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcManoObraTotal', '₡' + manoObra.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoTotal', '₡' + costoTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcMargenGananciaValor', margenGanancia + '%');
    setText('calcGananciaVela', '₡' + gananciaVela.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcPrecioVenta', '₡' + precioVenta.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));

    return {
        pesoVela, porcentajeFragancia,
        pesoFraganciaKg: pesoFraganciaKg * 1000,
        pesoCeraKg: pesoCeraKg * 1000,
        costoCeraKg, costoFraganciaKg, costoMecheEnvase,
        costosIndirectos, manoObra, margenGanancia,
        costoCeraTotal, costoFraganciaTotal, costoTotal,
        gananciaVela, precioVenta,
        nombreProducto: document.getElementById('calcNombreProducto')?.value || ''
    };
}

function formatearFechaFirestore(fechaGuardado) {
    if (!fechaGuardado) return 'Sin fecha';
    if (typeof fechaGuardado.toDate === 'function') {
        return fechaGuardado.toDate().toLocaleString('es-CR');
    }
    if (fechaGuardado.seconds !== undefined) {
        const date = new Date(fechaGuardado.seconds * 1000 + (fechaGuardado.nanoseconds || 0) / 1000000);
        return date.toLocaleString('es-CR');
    }
    if (fechaGuardado instanceof Date) return fechaGuardado.toLocaleString('es-CR');
    if (typeof fechaGuardado === 'string') return new Date(fechaGuardado).toLocaleString('es-CR');
    return 'Sin fecha';
}

async function guardarCalculoFirestore() {
    const calculo = calcularProduccion();
    if (calculo.costoTotal === 0) {
        showToast('Ingresa los datos antes de guardar', true);
        return;
    }

    try {
        const dataToSave = {
            ...calculo,
            tipoCera: document.getElementById('calcTipoCera')?.value || 'cera_china',
            fechaGuardado: isOnline && db ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
            imagenBase64: currentImageBase64 || null,
            imagenUrl: currentImageUrl || null,
            synced: isOnline && db ? true : false
        };

        if (currentEditingId) {
            if (isOnline && db) {
                await db.collection('calculadora_produccion').doc(currentEditingId).update(dataToSave);
            }
            const localCalcs = loadFromLocal('calculadora_calculos') || [];
            const idx = localCalcs.findIndex(c => c.id === currentEditingId);
            if (idx !== -1) {
                localCalcs[idx] = { ...localCalcs[idx], ...dataToSave };
                saveToLocal('calculadora_calculos', localCalcs);
            }
            showToast('Calculo actualizado');
            currentEditingId = null;

            const saveBtn = document.getElementById('calcBtnSave');
            if (saveBtn) {
                saveBtn.innerHTML = 'Guardar';
                saveBtn.onclick = guardarCalculoFirestore;
                saveBtn.classList.remove('calc-btn-update');
                saveBtn.classList.add('calc-btn-save');
            }
        } else {
            const newId = 'calc_' + Date.now();
            if (isOnline && db) {
                const docRef = await db.collection('calculadora_produccion').add(dataToSave);
                dataToSave.id = docRef.id;
            } else {
                dataToSave.id = newId;
            }
            const localCalcs = loadFromLocal('calculadora_calculos') || [];
            localCalcs.unshift(dataToSave);
            saveToLocal('calculadora_calculos', localCalcs);
            showToast('Calculo guardado');
        }

        cargarHistorialCalculadora();
    } catch (error) {
        console.error('Error guardando:', error);
        showToast('Error al guardar', true);
    }
}

async function cargarHistorialCalculadora() {
    let calculos = [];

    if (isOnline && db) {
        try {
            const snapshot = await db.collection('calculadora_produccion')
                .orderBy('fechaGuardado', 'desc')
                .limit(20)
                .get();
            snapshot.forEach(doc => {
                calculos.push({ id: doc.id, ...doc.data() });
            });
            saveToLocal('calculadora_calculos', calculos);
        } catch (error) {
            console.error('Error cargando desde Firestore:', error);
        }
    }

    if (calculos.length === 0) {
        calculos = loadFromLocal('calculadora_calculos') || [];
    }

    const list = document.getElementById('calcHistorialList');
    if (!list) return;

    if (calculos.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.9rem;">No hay calculos guardados.</p>';
        return;
    }

    let html = '';
    calculos.forEach(data => {
        const fecha = formatearFechaFirestore(data.fechaGuardado);
        let imagenHTML = '';

        if (data.imagenBase64) {
            imagenHTML = `<img src="${data.imagenBase64}" class="calc-historial-img" alt="Producto">`;
        } else if (data.imagenUrl) {
            imagenHTML = `<img src="${data.imagenUrl}" class="calc-historial-img" alt="Producto">`;
        } else {
            imagenHTML = '<div class="calc-historial-img-placeholder">🖼️</div>';
        }

        html += `
            <div class="calc-historial-item" onclick="cargarCalculoPorId('${data.id}')">
                ${imagenHTML}
                <div class="calc-historial-item-info">
                    <h4>${data.nombreProducto || 'Sin nombre'}</h4>
                    <p>📅 ${fecha} | 💰 Costo: ₡${(data.costoTotal?.toLocaleString() || 0)} | 💵 Venta: ₡${(data.precioVenta?.toLocaleString() || 0)}</p>
                </div>
                <div class="calc-historial-actions">
                    <button class="btn-edit" onclick="event.stopPropagation(); editarCalculoPorId('${data.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="event.stopPropagation(); eliminarCalculoPorId('${data.id}')" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

async function cargarCalculoPorId(docId) {
    let data = null;

    if (isOnline && db) {
        try {
            const docSnap = await db.collection('calculadora_produccion').doc(docId).get();
            if (docSnap.exists) {
                data = { id: docSnap.id, ...docSnap.data() };
            }
        } catch (e) {
            console.error('Error cargando desde Firestore:', e);
        }
    }

    if (!data) {
        const localCalcs = loadFromLocal('calculadora_calculos') || [];
        data = localCalcs.find(c => c.id === docId);
    }

    if (data) {
        cargarDatosEnFormulario(data);
        showToast('Calculo cargado');
    }
}

async function editarCalculoPorId(docId) {
    let data = null;

    if (isOnline && db) {
        try {
            const docSnap = await db.collection('calculadora_produccion').doc(docId).get();
            if (docSnap.exists) data = { id: docSnap.id, ...docSnap.data() };
        } catch (e) {
            console.error('Error:', e);
        }
    }

    if (!data) {
        const localCalcs = loadFromLocal('calculadora_calculos') || [];
        data = localCalcs.find(c => c.id === docId);
    }

    if (data) {
        cargarDatosEnFormulario(data);
        currentEditingId = docId;
        const saveBtn = document.getElementById('calcBtnSave');
        if (saveBtn) {
            saveBtn.innerHTML = 'Actualizar';
            saveBtn.classList.remove('calc-btn-save');
            saveBtn.classList.add('calc-btn-update');
        }
        showToast('Modo edicion activado');
        abrirCalculadora();
    }
}

function cargarDatosEnFormulario(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('calcNombreProducto', data.nombreProducto || '');
    setVal('calcTipoCera', data.tipoCera || 'cera_china');
    setVal('calcPesoVela', data.pesoVela || 0);
    setVal('calcPorcentajeFragancia', data.porcentajeFragancia || 10);
    setVal('calcCostoCera', data.costoCeraKg || 0);
    setVal('calcCostoFragancia', data.costoFraganciaKg || 0);
    setVal('calcCostoMecheEnvase', data.costoMecheEnvase || 0);
    setVal('calcCostosIndirectos', data.costosIndirectos || 0);
    setVal('calcManoObra', data.manoObra || 0);
    setVal('calcMargenGanancia', data.margenGanancia || 50);
    setVal('calcImagenUrlInput', '');

    if (data.imagenBase64) {
        currentImageBase64 = data.imagenBase64;
        currentImageUrl = null;
        mostrarPreviewImagen(data.imagenBase64);
        cambiarTabImagen('file');
    } else if (data.imagenUrl) {
        currentImageUrl = data.imagenUrl;
        currentImageBase64 = null;
        mostrarPreviewImagen(data.imagenUrl);
        setVal('calcImagenUrlInput', data.imagenUrl);
        cambiarTabImagen('url');
    } else {
        removerImagen();
    }

    calcularProduccion();
}

async function eliminarCalculoPorId(docId) {
    if (!confirm('Eliminar este calculo?')) return;

    try {
        if (isOnline && db) {
            await db.collection('calculadora_produccion').doc(docId).delete();
        }
        const localCalcs = loadFromLocal('calculadora_calculos') || [];
        const filtered = localCalcs.filter(c => c.id !== docId);
        saveToLocal('calculadora_calculos', filtered);
        showToast('Calculo eliminado');
        cargarHistorialCalculadora();
    } catch (e) {
        console.error('Error eliminando:', e);
        showToast('Error al eliminar', true);
    }
}

function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const calculo = calcularProduccion();
    const nombreProducto = document.getElementById('calcNombreProducto')?.value || 'Sin_nombre';

    doc.setFontSize(20);
    doc.text('Esentia - Calculadora de Produccion', 20, 20);
    doc.setFontSize(12);
    doc.text('Fecha: ' + new Date().toLocaleString(), 20, 30);
    doc.text('Producto: ' + nombreProducto, 20, 40);
    doc.setFontSize(14);
    doc.text('Detalles de Costos:', 20, 55);

    let y = 65;
    doc.setFontSize(11);
    doc.text('Peso Total: ' + calculo.pesoVela + 'g', 20, y); y += 10;
    doc.text('Peso Fragancia (' + calculo.porcentajeFragancia + '%): ' + calculo.pesoFraganciaKg.toFixed(1) + 'g', 20, y); y += 10;
    doc.text('Peso Cera (Restante): ' + calculo.pesoCeraKg.toFixed(1) + 'g', 20, y); y += 15;
    doc.text('Costo de Cera: ' + calculo.costoCeraTotal.toLocaleString(), 20, y); y += 10;
    doc.text('Costo de Fragancia: ' + calculo.costoFraganciaTotal.toLocaleString(), 20, y); y += 10;
    doc.text('Mecha + Envase: ' + calculo.costoMecheEnvase.toLocaleString(), 20, y); y += 10;
    doc.text('Costos Indirectos: ' + calculo.costosIndirectos.toLocaleString(), 20, y); y += 10;
    doc.text('Mano de Obra: ' + calculo.manoObra.toLocaleString(), 20, y); y += 15;

    doc.setFontSize(13);
    doc.text('COSTO TOTAL: ' + calculo.costoTotal.toLocaleString(), 20, y); y += 15;
    doc.setFontSize(11);
    doc.text('Margen de Ganancia: ' + calculo.margenGanancia + '%', 20, y); y += 10;
    doc.text('Ganancia por Vela: ' + calculo.gananciaVela.toLocaleString(), 20, y); y += 15;

    doc.setFontSize(16);
    doc.setTextColor(245, 158, 11);
    doc.text('PRECIO DE VENTA SUGERIDO: ' + calculo.precioVenta.toLocaleString(), 20, y);

    if (currentImageBase64) {
        try {
            doc.addImage(currentImageBase64, 'JPEG', 150, 20, 40, 40);
        } catch (e) { console.log('No se pudo agregar imagen al PDF'); }
    }

    doc.save('calculadora_' + nombreProducto.replace(/\s+/g, '_') + '.pdf');
    showToast('PDF descargado');
}

function descargarExcel() {
    const calculo = calcularProduccion();
    const nombreProducto = document.getElementById('calcNombreProducto')?.value || 'Sin_nombre';

    const datos = {
        'Producto': nombreProducto,
        'Fecha': new Date().toLocaleString(),
        'Peso Vela (g)': calculo.pesoVela,
        'Porcentaje Fragancia (%)': calculo.porcentajeFragancia,
        'Peso Fragancia (g)': calculo.pesoFraganciaKg.toFixed(2),
        'Peso Cera (g)': calculo.pesoCeraKg.toFixed(2),
        'Costo Cera/kg': calculo.costoCeraKg,
        'Costo Fragancia/kg': calculo.costoFraganciaKg,
        'Costo Meche+Envase': calculo.costoMecheEnvase,
        'Costos Indirectos': calculo.costosIndirectos,
        'Mano de Obra': calculo.manoObra,
        'Costo Cera Total': calculo.costoCeraTotal,
        'Costo Fragancia Total': calculo.costoFraganciaTotal,
        'COSTO TOTAL': calculo.costoTotal,
        'Margen Ganancia (%)': calculo.margenGanancia,
        'Ganancia por Vela': calculo.gananciaVela,
        'PRECIO DE VENTA': calculo.precioVenta
    };

    const ws = XLSX.utils.json_to_sheet([datos]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calculo');
    XLSX.writeFile(wb, 'calculadora_' + nombreProducto.replace(/\s+/g, '_') + '.xlsx');
    showToast('Excel descargado');
}

function limpiarCalculadora() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('calcPesoVela', '');
    setVal('calcPorcentajeFragancia', '10');
    setVal('calcCostoCera', '');
    setVal('calcCostoFragancia', '');
    setVal('calcCostoMecheEnvase', '');
    setVal('calcCostosIndirectos', '');
    setVal('calcManoObra', '');
    setVal('calcMargenGanancia', '50');
    setVal('calcNombreProducto', '');
    setVal('calcTipoCera', 'cera_china');
    setVal('calcImagenUrlInput', '');
    removerImagen();

    currentEditingId = null;
    const saveBtn = document.getElementById('calcBtnSave');
    if (saveBtn) {
        saveBtn.innerHTML = 'Guardar';
        saveBtn.classList.remove('calc-btn-update');
        saveBtn.classList.add('calc-btn-save');
    }

    calcularProduccion();
    showToast('Calculadora limpiada');
}