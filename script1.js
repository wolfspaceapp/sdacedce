// ═══════════════════════════════════════════════════════
// WOLF SPACE - Sistema de Entretenimiento v2.0
// JavaScript Principal con Firestore Integration
// ═══════════════════════════════════════════════════════

// ─── ANIMACIÓN DE ESCRITURA LETRA POR LETRA ──────────────
function typeWriterEffect() {
    const text = "WOLF SPACE";
    const element = document.getElementById('typing-text');
    if (!element) return;
    
    let index = 0;
    element.textContent = '';
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, 100); // 100ms entre cada letra - más rápido y moderno
        } else {
            // Cuando termina de escribir, quitar el borde (cursor) después de 1 segundo
            setTimeout(() => {
                element.style.borderRight = 'none';
            }, 1000);
        }
    }
    
    // Iniciar la animación después de un pequeño delay
    setTimeout(type, 200);
}

// ─── CONFIGURACIÓN DE FIREBASE ───────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDEmVZ0GQdMR9xnbRwt-X5bQFH6IUiumdo",
    authDomain: "codewolf-63953.firebaseapp.com",
    projectId: "codewolf-63953",
    storageBucket: "codewolf-63953.firebasestorage.app",
    messagingSenderId: "579650848946",
    appId: "1:579650848946:web:905b93aa432fcfbd9e61ab",
    measurementId: "G-W5D4M6E7K1"
};

// Inicializar Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('🔥 Firebase conectado exitosamente');
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
}

// ─── VARIABLES GLOBALES ──────────────────────────────────
let newsCache = [];
let rewardsCache = [];
let userRedeemHistory = [];
const viewedNewsIds = new Set(JSON.parse(localStorage.getItem('wolfspace_viewed_news') || '[]'));

// ─── FUNCIONES DE FIRESTORE ──────────────────────────────

// Cargar noticias desde Firestore
async function loadNewsFromFirestore() {
    if (!db) {
        console.error('Firebase no está inicializado');
        showNewsError('Error de conexión con el servidor');
        return;
    }
    
    try {
        const newsRef = db.collection('news').orderBy('timestamp', 'desc').limit(20);
        const snapshot = await newsRef.get();
        
        newsCache = [];
        const now = new Date();
        const expiredNewsIds = [];
        
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const newsData = doc.data();
                
                // Verificar si la noticia ha expirado
                if (newsData.expiresAt) {
                    const expiryDate = newsData.expiresAt.toDate();
                    
                    if (expiryDate < now) {
                        // Noticia expirada, marcar para eliminar
                        expiredNewsIds.push(doc.id);
                        console.log(`🗑️ Noticia expirada: ${newsData.title}`);
                        return; // No agregar a newsCache
                    }
                }
                
                // Agregar noticia válida
                newsCache.push({
                    id: doc.id,
                    ...newsData
                });
            });
            
            // Eliminar noticias expiradas de Firestore
            if (expiredNewsIds.length > 0) {
                deleteExpiredNews(expiredNewsIds);
            }
            
            if (newsCache.length > 0) {
                console.log(`✅ ${newsCache.length} noticias cargadas`);
            } else {
                console.log('No hay noticias disponibles (todas expiradas)');
            }
        } else {
            console.log('No hay noticias disponibles en la base de datos');
        }
        
        renderNews();
        updateNewsCounter();
    } catch (error) {
        console.error('Error al cargar noticias:', error);
        showNewsError('Error al cargar las noticias. Intenta de nuevo más tarde.');
    }
}

// Eliminar noticias expiradas de Firestore
async function deleteExpiredNews(newsIds) {
    if (!db || !newsIds || newsIds.length === 0) return;
    
    try {
        const batch = db.batch();
        let deleteCount = 0;
        
        newsIds.forEach(newsId => {
            const newsRef = db.collection('news').doc(newsId);
            batch.delete(newsRef);
            deleteCount++;
        });
        
        await batch.commit();
        console.log(`🗑️ ${deleteCount} noticias expiradas eliminadas de la base de datos`);
    } catch (error) {
        console.error('Error al eliminar noticias expiradas:', error);
    }
}

// Mostrar mensaje de error en la sección de noticias
function showNewsError(message) {
    const newsContainer = document.querySelector('#news-dialog .app-section-body');
    if (!newsContainer) return;
    
    newsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.3; color: #ff4444;">
                <i class="fa-solid fa-exclamation-triangle"></i>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                Error al cargar noticias
            </div>
            <div style="font-size: 14px; color: var(--text-secondary); max-width: 300px;">
                ${message}
            </div>
        </div>
    `;
}

// Calcular tiempo relativo automáticamente
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Hace un momento';
    
    const now = new Date();
    const newsDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - newsDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffSeconds < 60) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffWeeks < 4) return `Hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
    if (diffMonths < 12) return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    
    return newsDate.toLocaleDateString('es-ES');
}

// Renderizar noticias en el DOM
function renderNews() {
    const newsContainer = document.getElementById('news-list-container');
    if (!newsContainer) return;
    
    if (newsCache.length === 0) {
        newsContainer.innerHTML = `
            <div class="news-empty-state">
                <i class="fa-solid fa-newspaper"></i>
                <h3>No hay noticias disponibles</h3>
                <p>Actualmente no hay noticias publicadas. Vuelve más tarde para ver las últimas novedades.</p>
            </div>
        `;
        return;
    }
    
    // Filtrar solo noticias activas
    const activeNews = newsCache.filter(news => news.active);
    
    if (activeNews.length === 0) {
        newsContainer.innerHTML = `
            <div class="news-empty-state">
                <i class="fa-solid fa-newspaper"></i>
                <h3>No hay noticias disponibles</h3>
                <p>Actualmente no hay noticias publicadas. Vuelve más tarde para ver las últimas novedades.</p>
            </div>
        `;
        return;
    }
    
    newsContainer.innerHTML = activeNews.map(news => {
        const iconMap = {
            'rocket': 'fa-rocket',
            'tv': 'fa-tv',
            'book': 'fa-book',
            'film': 'fa-film',
            'dragon': 'fa-dragon',
            'shield': 'fa-shield-halved',
            'star': 'fa-star',
            'mobile': 'fa-mobile-screen',
            'newspaper': 'fa-newspaper'
        };
        
        const iconClass = iconMap[news.icon] || 'fa-newspaper';
        const timeAgo = getTimeAgo(news.timestamp);
        const isUnread = !viewedNewsIds.has(news.id);
        const unreadClass = isUnread ? 'unread' : '';
        const unreadBadge = isUnread ? '<span class="news-item-unread-badge">Nueva</span>' : '';
        
        return `
            <div class="news-item ${unreadClass}" onclick="showNewsDetail('${news.id}')">
                <div class="news-item-icon">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="news-item-content">
                    <div class="news-item-header">
                        <div class="news-item-title">${news.title}</div>
                        ${unreadBadge}
                    </div>
                    <div class="news-item-text">${news.text}</div>
                    <div class="news-item-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Actualizar contador de noticias no vistas
function updateNewsCounter() {
    const badge = document.getElementById('news-counter-badge');
    if (!badge) return;
    
    const activeNews = newsCache.filter(news => news.active);
    const unreadCount = activeNews.filter(news => !viewedNewsIds.has(news.id)).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// Mostrar detalle de una noticia
function showNewsDetail(newsId) {
    const news = newsCache.find(n => n.id === newsId);
    if (!news) return;
    
    const iconMap = {
        'rocket': 'fa-rocket',
        'tv': 'fa-tv',
        'book': 'fa-book',
        'film': 'fa-film',
        'dragon': 'fa-dragon',
        'shield': 'fa-shield-halved',
        'star': 'fa-star',
        'mobile': 'fa-mobile-screen',
        'newspaper': 'fa-newspaper'
    };
    
    const iconClass = iconMap[news.icon] || 'fa-newspaper';
    const timeAgo = getTimeAgo(news.timestamp);
    
    document.getElementById('news-detail-icon').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    document.getElementById('news-detail-title').textContent = news.title;
    document.getElementById('news-detail-time').textContent = timeAgo;
    document.getElementById('news-detail-text').textContent = news.text;
    
    // Marcar como vista
    markNewsAsViewed(newsId);
    
    openSection('news-detail-dialog');
}

// Marcar noticia como vista
function markNewsAsViewed(newsId) {
    if (!viewedNewsIds.has(newsId)) {
        viewedNewsIds.add(newsId);
        localStorage.setItem('wolfspace_viewed_news', JSON.stringify([...viewedNewsIds]));
        updateNewsCounter();
        // Actualizar la vista de la lista de noticias
        renderNews();
    }
}

// Cerrar detalle de noticia y volver a la lista
function closeNewsDetail() {
    closeSection('news-detail-dialog');
}

// Abrir historial de canjes
async function openRedeemHistory() {
    openSection('redeem-history-section');
    loadRedeemHistory();
}

// Cargar historial de canjes desde localStorage
function loadRedeemHistory() {
    const historyContainer = document.getElementById('redeem-history-list');
    
    if (!historyContainer) return;
    
    // Mostrar loading brevemente
    historyContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
            <div class="loading-dots" style="margin-bottom: 20px;">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
            <div style="font-size: 14px; color: var(--gray-500);">
                Cargando historial...
            </div>
        </div>
    `;
    
    setTimeout(() => {
        try {
            // Obtener historial de localStorage
            const history = JSON.parse(localStorage.getItem('wolfspace_redeem_history') || '[]');
            
            if (history.length === 0) {
                historyContainer.innerHTML = `
                    <div class="redeem-history-empty">
                        <i class="fa-solid fa-ticket"></i>
                        <h3>Sin canjes registrados</h3>
                        <p>Aún no has canjeado ningún código</p>
                    </div>
                `;
                return;
            }
            
            renderRedeemHistory(history);
            
        } catch (error) {
            console.error('Error al cargar historial:', error);
            historyContainer.innerHTML = `
                <div class="redeem-history-empty">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <h3>Error al cargar historial</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }, 300);
}

// Renderizar historial de canjes
function renderRedeemHistory(items) {
    const historyContainer = document.getElementById('redeem-history-list');
    
    if (!historyContainer) return;
    
    const typeIcons = {
        'subscription': 'fa-tv',
        'redeem_data': 'fa-clipboard-list',
        'access_code': 'fa-key',
        'coins': 'fa-coins',
        'content': 'fa-film'
    };
    
    const typeLabels = {
        'subscription': 'Suscripción',
        'redeem_data': 'Datos de Canje',
        'access_code': 'Código de Acceso',
        'coins': 'Monedas',
        'content': 'Contenido'
    };
    
    historyContainer.innerHTML = items.map(item => {
        const iconClass = typeIcons[item.rewardType] || 'fa-gift';
        const typeLabel = typeLabels[item.rewardType] || 'Recompensa';
        const date = new Date(item.redeemedAt);
        const dateStr = date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="redeem-history-item">
                <div class="redeem-history-icon" onclick="viewRedeemDetails('${item.id}')" style="cursor: pointer;">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="redeem-history-content" onclick="viewRedeemDetails('${item.id}')" style="cursor: pointer;">
                    <div class="redeem-history-name">${item.rewardName || 'Recompensa'}</div>
                    <div class="redeem-history-details">
                        <span class="redeem-history-type">${typeLabel}</span>
                        <span class="redeem-history-dot">•</span>
                        <span class="redeem-history-code">${item.code}</span>
                    </div>
                    <div class="redeem-history-date">
                        <i class="fa-solid fa-clock"></i>
                        ${dateStr}
                    </div>
                </div>
                <div class="redeem-history-actions">
                    <button class="redeem-history-btn redeem-history-btn-view" onclick="viewRedeemDetails('${item.id}')" title="Ver detalles">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="redeem-history-btn redeem-history-btn-delete" onclick="deleteRedeemHistoryEntry('${item.id}')" title="Eliminar del historial">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Eliminar entrada del historial
function deleteRedeemHistoryEntry(entryId) {
    // Crear modal de confirmación personalizado
    let confirmModal = document.getElementById('delete-confirm-modal');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'delete-confirm-modal';
        confirmModal.className = 'dialog-backdrop';
        document.body.appendChild(confirmModal);
    }
    
    // Obtener información del canje
    const history = JSON.parse(localStorage.getItem('wolfspace_redeem_history') || '[]');
    const entry = history.find(item => item.id === entryId);
    const rewardName = entry ? entry.rewardName : 'este canje';
    
    confirmModal.innerHTML = `
        <div class="dialog delete-confirm-dialog">
            <div class="dialog-top">
                <div class="dialog-icon-wrap delete-icon-wrap">
                    <i class="fa-solid fa-trash-can"></i>
                </div>
                <div class="dialog-title">Eliminar del Historial</div>
            </div>
            <div class="dialog-body">
                <p style="margin-bottom: 12px;">¿Estás seguro de que deseas eliminar <strong>${rewardName}</strong> del historial?</p>
                <p style="color: var(--gray-500); font-size: 12px;">
                    <i class="fa-solid fa-info-circle"></i>
                    Esta acción no se puede deshacer. Los datos se eliminarán permanentemente.
                </p>
            </div>
            <div class="dialog-actions dialog-actions-split">
                <button class="dialog-btn dialog-btn-secondary" id="cancel-delete-btn">
                    Cancelar
                </button>
                <button class="dialog-btn dialog-btn-danger" id="confirm-delete-btn">
                    <i class="fa-solid fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </div>
    `;
    
    confirmModal.classList.add('show');
    
    // Event listeners
    setTimeout(() => {
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
            confirmModal.classList.remove('show');
            setTimeout(() => confirmModal.remove(), 300);
        });
        
        document.getElementById('confirm-delete-btn')?.addEventListener('click', () => {
            confirmModal.classList.remove('show');
            setTimeout(() => confirmModal.remove(), 300);
            
            // Ejecutar eliminación
            try {
                const history = JSON.parse(localStorage.getItem('wolfspace_redeem_history') || '[]');
                const newHistory = history.filter(item => item.id !== entryId);
                localStorage.setItem('wolfspace_redeem_history', JSON.stringify(newHistory));
                loadRedeemHistory();
                showToast('✅ Canje eliminado del historial');
            } catch (error) {
                console.error('Error al eliminar canje:', error);
                showToast('❌ Error al eliminar el canje');
            }
        });
        
        // Cerrar al hacer clic en el fondo
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('show');
                setTimeout(() => confirmModal.remove(), 300);
            }
        };
    }, 50);
}

// Ver detalles de un canje guardado
function viewRedeemDetails(entryId) {
    try {
        // Obtener historial de localStorage
        const history = JSON.parse(localStorage.getItem('wolfspace_redeem_history') || '[]');
        
        // Buscar el canje específico
        const entry = history.find(item => item.id === entryId);
        
        if (!entry) {
            showToast('❌ No se encontró el canje');
            return;
        }
        
        // Guardar que venimos del historial para volver correctamente
        sessionStorage.setItem('wolfspace_return_to', 'redeem-section');
        
        // Mostrar los detalles según el tipo usando los modales existentes
        const rewardData = entry.rewardData;
        
        // Cerrar historial primero
        closeSection('redeem-history-section');
        
        // Mostrar modal con los datos
        setTimeout(() => {
            showRewardDetails(rewardData);
        }, 350);
        
    } catch (error) {
        console.error('Error al ver detalles:', error);
        showToast('❌ Error al cargar los detalles');
    }
}

// Cargar recompensas desde Firestore
async function loadRewardsFromFirestore() {
    if (!db) {
        console.error('Firebase no está inicializado');
        return;
    }
    
    try {
        const rewardsRef = db.collection('rewards').where('active', '==', true);
        const snapshot = await rewardsRef.get();
        
        if (snapshot.empty) {
            console.log('No hay recompensas disponibles');
            return;
        }
        
        rewardsCache = [];
        snapshot.forEach(doc => {
            rewardsCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ ${rewardsCache.length} recompensas cargadas`);
    } catch (error) {
        console.error('Error al cargar recompensas:', error);
        showToast('Error al cargar recompensas');
    }
}

// Validar y canjear código
async function redeemCode() {
    const input = document.getElementById('redeem-input');
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        showToast('⚠️ Por favor ingresa un código');
        return;
    }
    
    if (!db) {
        showToast('❌ Error de conexión con el servidor');
        return;
    }
    
    try {
        // Buscar el código en Firestore
        const codesRef = db.collection('redeem_codes').where('code', '==', code);
        const snapshot = await codesRef.get();
        
        if (snapshot.empty) {
            showToast('❌ Código inválido o expirado');
            input.value = '';
            return;
        }
        
        const codeDoc = snapshot.docs[0];
        const codeData = codeDoc.data();
        
        // Verificar si el código ya fue usado
        if (codeData.used) {
            showToast('⚠️ Este código ya fue utilizado');
            input.value = '';
            return;
        }
        
        // Verificar fecha de expiración
        if (codeData.expirationDate) {
            const expDate = codeData.expirationDate.toDate();
            if (expDate < new Date()) {
                showToast('⏰ Este código ha expirado');
                input.value = '';
                return;
            }
        }
        
        // Marcar código como usado
        await codeDoc.ref.update({
            used: true,
            usedAt: firebase.firestore.FieldValue.serverTimestamp(),
            usedBy: getUserId()
        });
        
        // Guardar en historial del usuario (localStorage)
        saveRedeemHistory(code, codeData);
        
        // Mostrar detalles de la recompensa según el tipo
        showRewardDetails(codeData);
        
        input.value = '';
        
    } catch (error) {
        console.error('Error al canjear código:', error);
        showToast('❌ Error al procesar el código');
    }
}

// Mostrar detalles de la recompensa canjeada
function showRewardDetails(rewardData) {
    const type = rewardData.rewardType;
    
    // Cerrar sección de canje
    closeSection('redeem-section');
    
    // Mostrar modal específico según el tipo
    if (type === 'subscription' && rewardData.credentials) {
        showSubscriptionCredentials(rewardData);
    } else if (type === 'redeem_data' && rewardData.redeemData) {
        showRedeemDataReward(rewardData);
    } else if (type === 'access_code' && rewardData.accessCodeValue) {
        showAccessCodeReward(rewardData);
    } else {
        showGenericReward(rewardData);
    }
}

// Modal moderno para credenciales de suscripción
function showSubscriptionCredentials(rewardData) {
    const creds = rewardData.credentials;
    
    // Crear modal si no existe
    let modal = document.getElementById('subscription-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'subscription-modal';
        modal.className = 'app-section-backdrop';
        document.body.appendChild(modal);
    }
    
    // Guardar contraseña para toggle
    window.tempPassword = creds.password;
    
    modal.innerHTML = `
        <div class="app-section subscription-credentials-section">
            <div class="app-section-header">
                <button class="app-section-back" id="close-subscription-btn-1" aria-label="Cerrar">
                    <i class="fa-solid fa-times"></i>
                </button>
                <div class="app-section-title">
                    <i class="fa-solid fa-tv"></i>
                    Suscripción Canjeada
                </div>
                <div style="width:36px;"></div>
            </div>
            
            <div class="app-section-body">
                <div class="subscription-success-header">
                    <div class="success-checkmark">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <h2 class="success-title">${rewardData.rewardName}</h2>
                    <p class="success-subtitle">¡Disfruta de tu suscripción!</p>
                </div>
                
                <div class="credentials-container">
                    <div class="credentials-intro">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Guarda estos datos de forma segura</span>
                    </div>
                    
                    <!-- Servicio -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-server"></i>
                            <span>Servicio</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value">${creds.service}</div>
                            <button class="copy-btn" data-copy="${creds.service}" data-msg="Servicio copiado" title="Copiar">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Correo -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-envelope"></i>
                            <span>Correo Electrónico</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value">${creds.email}</div>
                            <button class="copy-btn" data-copy="${creds.email}" data-msg="Correo copiado" title="Copiar">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Contraseña -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-key"></i>
                            <span>Contraseña</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value credential-password" id="password-field">••••••••</div>
                            <button class="toggle-password-btn" id="toggle-password-btn" title="Mostrar/Ocultar">
                                <i class="fa-solid fa-eye" id="password-toggle-icon"></i>
                            </button>
                            <button class="copy-btn" data-copy="${creds.password}" data-msg="Contraseña copiada" title="Copiar">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    ${creds.pin ? `
                    <!-- PIN -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-lock"></i>
                            <span>PIN</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value">${creds.pin}</div>
                            <button class="copy-btn" data-copy="${creds.pin}" data-msg="PIN copiado" title="Copiar">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${creds.profileNumber ? `
                    <!-- Perfil -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-user-circle"></i>
                            <span>Perfil Recomendado</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value">${creds.profileNumber}</div>
                            <button class="copy-btn" data-copy="${creds.profileNumber}" data-msg="Perfil copiado" title="Copiar">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="subscription-tips">
                    <div class="tip-item">
                        <i class="fa-solid fa-lightbulb"></i>
                        <span>Captura de pantalla recomendada para guardar estos datos</span>
                    </div>
                    <div class="tip-item">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>No compartas esta información con terceros</span>
                    </div>
                </div>
                
                <button class="subscription-close-btn" id="close-subscription-btn-2">
                    <i class="fa-solid fa-check"></i>
                    Entendido
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Agregar event listeners después de crear el HTML
    setTimeout(() => {
        // Botones de cerrar
        document.getElementById('close-subscription-btn-1')?.addEventListener('click', closeSubscriptionModal);
        document.getElementById('close-subscription-btn-2')?.addEventListener('click', closeSubscriptionModal);
        
        // Botón toggle password
        document.getElementById('toggle-password-btn')?.addEventListener('click', togglePassword);
        
        // Botones de copiar
        document.querySelectorAll('#subscription-modal .copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-copy');
                const msg = this.getAttribute('data-msg');
                copyToClipboard(text, msg);
            });
        });
        
        // Cerrar al hacer clic en el fondo
        modal.onclick = (e) => {
            if (e.target === modal) closeSubscriptionModal();
        };
    }, 50);
}

// Cerrar modal de suscripción
function closeSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    window.tempPassword = null;
    
    // Volver a la sección de canje si venimos del historial
    const returnTo = sessionStorage.getItem('wolfspace_return_to');
    if (returnTo === 'redeem-section') {
        sessionStorage.removeItem('wolfspace_return_to');
        setTimeout(() => {
            openSection('redeem-section');
        }, 350);
    }
}

// Toggle mostrar/ocultar contraseña
function togglePassword() {
    const field = document.getElementById('password-field');
    const icon = document.getElementById('password-toggle-icon');
    
    if (field.textContent === '••••••••') {
        field.textContent = window.tempPassword || '••••••••';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        field.textContent = '••••••••';
        icon.className = 'fa-solid fa-eye';
    }
}

// Copiar al portapapeles
function copyToClipboard(text, message = 'Copiado') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`✅ ${message}`);
    }).catch(() => {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`✅ ${message}`);
    });
}

// Modal para datos de canje
function showRedeemDataReward(rewardData) {
    // Crear modal si no existe
    let modal = document.getElementById('redeem-data-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'redeem-data-modal';
        modal.className = 'app-section-backdrop';
        document.body.appendChild(modal);
    }
    
    // Escapar backticks para copiar
    const safeData = rewardData.redeemData.replace(/`/g, '\\`');
    
    modal.innerHTML = `
        <div class="app-section subscription-credentials-section">
            <div class="app-section-header">
                <button class="app-section-back" id="close-redeem-data-btn-1" aria-label="Cerrar">
                    <i class="fa-solid fa-times"></i>
                </button>
                <div class="app-section-title">
                    <i class="fa-solid fa-clipboard-list"></i>
                    Datos de Canje
                </div>
                <div style="width:36px;"></div>
            </div>
            
            <div class="app-section-body">
                <div class="subscription-success-header">
                    <div class="success-checkmark">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <h2 class="success-title">${rewardData.rewardName}</h2>
                    <p class="success-subtitle">¡Información desbloqueada!</p>
                </div>
                
                <div class="credentials-container">
                    <div class="credentials-intro">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Guarda esta información de forma segura</span>
                    </div>
                    
                    <!-- Datos de Canje -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-info-circle"></i>
                            <span>Detalles</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value" style="white-space: pre-wrap; text-align: left;">${rewardData.redeemData}</div>
                            <button class="copy-btn" data-copy="${safeData}" data-msg="Información copiada" title="Copiar">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="subscription-tips">
                    <div class="tip-item">
                        <i class="fa-solid fa-lightbulb"></i>
                        <span>Captura de pantalla recomendada para guardar estos datos</span>
                    </div>
                    <div class="tip-item">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>No compartas esta información con terceros</span>
                    </div>
                </div>
                
                <button class="subscription-close-btn" id="close-redeem-data-btn-2">
                    <i class="fa-solid fa-check"></i>
                    Entendido
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Agregar event listeners
    setTimeout(() => {
        document.getElementById('close-redeem-data-btn-1')?.addEventListener('click', closeRedeemDataModal);
        document.getElementById('close-redeem-data-btn-2')?.addEventListener('click', closeRedeemDataModal);
        
        // Botón de copiar
        document.querySelectorAll('#redeem-data-modal .copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-copy');
                const msg = this.getAttribute('data-msg');
                copyToClipboard(text, msg);
            });
        });
        
        // Cerrar al hacer clic en el fondo
        modal.onclick = (e) => {
            if (e.target === modal) closeRedeemDataModal();
        };
    }, 50);
}

// Cerrar modal de datos de canje
function closeRedeemDataModal() {
    const modal = document.getElementById('redeem-data-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    
    // Volver a la sección de canje si venimos del historial
    const returnTo = sessionStorage.getItem('wolfspace_return_to');
    if (returnTo === 'redeem-section') {
        sessionStorage.removeItem('wolfspace_return_to');
        setTimeout(() => {
            openSection('redeem-section');
        }, 350);
    }
}

// Modal para código de acceso
function showAccessCodeReward(rewardData) {
    // Crear modal si no existe
    let modal = document.getElementById('access-code-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'access-code-modal';
        modal.className = 'app-section-backdrop';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="app-section subscription-credentials-section">
            <div class="app-section-header">
                <button class="app-section-back" id="close-access-code-btn-1" aria-label="Cerrar">
                    <i class="fa-solid fa-times"></i>
                </button>
                <div class="app-section-title">
                    <i class="fa-solid fa-key"></i>
                    Código de Acceso
                </div>
                <div style="width:36px;"></div>
            </div>
            
            <div class="app-section-body">
                <div class="subscription-success-header">
                    <div class="success-checkmark">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <h2 class="success-title">${rewardData.rewardName}</h2>
                    <p class="success-subtitle">¡Tu código de acceso está listo!</p>
                </div>
                
                <div class="credentials-container">
                    <div class="credentials-intro">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Guarda este código de forma segura</span>
                    </div>
                    
                    <!-- Código de Acceso -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-key"></i>
                            <span>Tu Código de Acceso</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value code-display" style="font-size: 18px; font-weight: 700; letter-spacing: 2px;">${rewardData.accessCodeValue}</div>
                            <button class="copy-btn" data-copy="${rewardData.accessCodeValue}" data-msg="Código copiado" title="Copiar código">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    ${rewardData.accessCodeDescription ? `
                    <!-- Descripción -->
                    <div class="credential-item">
                        <div class="credential-label">
                            <i class="fa-solid fa-info-circle"></i>
                            <span>Descripción</span>
                        </div>
                        <div class="credential-value-wrapper">
                            <div class="credential-value" style="white-space: pre-wrap; text-align: left;">${rewardData.accessCodeDescription}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="subscription-tips">
                    <div class="tip-item">
                        <i class="fa-solid fa-lightbulb"></i>
                        <span>Usa este código para acceder a la sesión o aplicación indicada</span>
                    </div>
                    <div class="tip-item">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>No compartas este código con otras personas</span>
                    </div>
                </div>
                
                <button class="subscription-close-btn" id="close-access-code-btn-2">
                    <i class="fa-solid fa-check"></i>
                    Entendido
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Agregar event listeners
    setTimeout(() => {
        document.getElementById('close-access-code-btn-1')?.addEventListener('click', closeAccessCodeModal);
        document.getElementById('close-access-code-btn-2')?.addEventListener('click', closeAccessCodeModal);
        
        // Botones de copiar
        document.querySelectorAll('#access-code-modal .copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-copy');
                const msg = this.getAttribute('data-msg');
                copyToClipboard(text, msg);
            });
        });
        
        // Cerrar al hacer clic en el fondo
        modal.onclick = (e) => {
            if (e.target === modal) closeAccessCodeModal();
        };
    }, 50);
}

// Cerrar modal de código de acceso
function closeAccessCodeModal() {
    const modal = document.getElementById('access-code-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    
    // Volver a la sección de canje si venimos del historial
    const returnTo = sessionStorage.getItem('wolfspace_return_to');
    if (returnTo === 'redeem-section') {
        sessionStorage.removeItem('wolfspace_return_to');
        setTimeout(() => {
            openSection('redeem-section');
        }, 350);
    }
}

// Modal genérico
function showGenericReward(rewardData) {
    showToast(`✅ ${rewardData.rewardName} canjeado! 🎉`);
}

// Modal para mostrar detalles de recompensa
function showRewardModal(message, details, rewardData) {
    // Crear modal si no existe
    let modal = document.getElementById('reward-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reward-details-modal';
        modal.className = 'dialog-backdrop';
        modal.innerHTML = `
            <div class="dialog">
                <div class="dialog-top">
                    <div class="dialog-icon-wrap"><i class="fa-solid fa-gift"></i></div>
                    <div class="dialog-title">¡Recompensa Canjeada!</div>
                </div>
                <div class="dialog-body" id="reward-details-content"></div>
                <div class="dialog-actions">
                    <button class="dialog-btn" onclick="closeRewardModal()">Entendido</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Actualizar contenido
    const content = document.getElementById('reward-details-content');
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent); margin-bottom: 10px;">
                ${rewardData.rewardName}
            </div>
        </div>
        ${details ? `<div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; white-space: pre-line; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.8;">${details}</div>` : ''}
    `;
    
    modal.classList.add('show');
    
    // Cerrar después de un tiempo si no tiene credenciales
    if (!details) {
        setTimeout(() => {
            closeRewardModal();
        }, 3000);
    }
}

function closeRewardModal() {
    const modal = document.getElementById('reward-details-modal');
    if (modal) {
        modal.classList.remove('show');
        // Cerrar sección de canje después de cerrar el modal
        setTimeout(() => {
            closeSection('redeem-section');
        }, 300);
    }
}

// Guardar historial de canje en localStorage
function saveRedeemHistory(code, rewardData) {
    try {
        // Obtener historial existente
        const history = JSON.parse(localStorage.getItem('wolfspace_redeem_history') || '[]');
        
        // Crear nuevo registro con toda la información
        const newEntry = {
            id: Date.now().toString(),
            code: code,
            rewardName: rewardData.rewardName,
            rewardType: rewardData.rewardType,
            rewardData: rewardData, // Guardar TODA la información del canje
            redeemedAt: new Date().toISOString()
        };
        
        // Agregar al inicio del array
        history.unshift(newEntry);
        
        // Limitar a los últimos 100 canjes
        if (history.length > 100) {
            history.splice(100);
        }
        
        // Guardar en localStorage
        localStorage.setItem('wolfspace_redeem_history', JSON.stringify(history));
        
        console.log('✅ Historial de canje guardado en localStorage');
    } catch (error) {
        console.error('Error al guardar historial:', error);
    }
}

// Obtener ID de usuario (implementar según tu sistema)
function getUserId() {
    // Por ahora retornamos un ID temporal basado en localStorage
    let userId = localStorage.getItem('wolfspace_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('wolfspace_user_id', userId);
    }
    return userId;
}

// Navegación entre módulos
function navigate(moduleName, action) {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingAvatar = document.getElementById('loading-avatar-img');
    
    // Configurar avatar según el módulo
    const avatarMap = {
        'Wolf Blaze': document.getElementById('avatar-blaze')?.src,
        'Wolf Anime': document.getElementById('avatar-anime')?.src
    };
    
    if (loadingAvatar && avatarMap[moduleName]) {
        loadingAvatar.src = avatarMap[moduleName];
    }
    
    // Mostrar pantalla de carga
    if (loadingScreen) {
        loadingScreen.classList.add('show');
    }
    
    // Navegar después de mostrar la animación
    setTimeout(() => {
        console.log(`Navegando a ${moduleName} con acción: ${action}`);
        
        // Si es una URL go: (Android custom URL), abrirla directamente
        if (action && action.startsWith('go:')) {
            window.location.href = action;
        } else if (action) {
            // Para otras URLs, abrir normalmente
            window.location.href = action;
        }
        
        // Fallback: Ocultar la pantalla de carga si la navegación falla
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.remove('show');
            }
        }, 2000);
    }, 800);
}

// Abrir diálogos/modales
function openDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.classList.add('show');
        // Prevenir scroll del body cuando el modal está abierto
        document.body.style.overflow = 'hidden';
    }
}

// Cerrar diálogos/modales
function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.classList.remove('show');
        // Restaurar scroll del body
        document.body.style.overflow = '';
    }
}

// Cerrar diálogo al hacer clic en el fondo
function closeDialogOnBg(event, dialogId) {
    if (event.target.classList.contains('dialog-backdrop')) {
        closeDialog(dialogId);
    }
}

// Mostrar noticias
function showNews() {
    openSection('news-dialog');
    
    // Mostrar indicador de carga
    const newsContainer = document.getElementById('news-list-container');
    if (newsContainer) {
        newsContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
                <div class="loading-dots" style="margin-bottom: 20px;">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
                <div style="font-size: 14px; color: var(--gray-500);">
                    Cargando noticias...
                </div>
            </div>
        `;
    }
    
    // Cargar noticias desde Firebase cada vez que se abre la sección
    loadNewsFromFirestore();
}

// Mostrar recompensas
function showRewards() {
    openSection('rewards-dialog');
}

// Abrir detalle de recompensa
function openReward(name, desc, icon, color) {
    document.getElementById('reward-detail-header-name').textContent = name;
    document.getElementById('reward-detail-name').textContent = name;
    document.getElementById('reward-detail-desc').textContent = desc;
    const iconEl = document.getElementById('reward-detail-icon');
    iconEl.textContent = icon;
    openSection('reward-detail-section');
}

// Reclamar recompensa
function claimReward() {
    const name = document.getElementById('reward-detail-name').textContent;
    closeSection('reward-detail-section');
    showToast(`¡${name} reclamada con éxito! 🎉`);
}

// Toast de confirmación
function showToast(msg) {
    let toast = document.getElementById('ws-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ws-toast';
        toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,0.1);z-index:9999;opacity:0;transition:all 0.3s;white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
}

// Abrir sección tipo app (pantalla completa, slide desde derecha)
function openSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Cerrar sección
function closeSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Cerrar sección al tocar el fondo (no aplica en pantalla completa, pero por seguridad)
function closeSectionOnBg(event, sectionId) {
    if (event.target.classList.contains('app-section-backdrop')) {
        closeSection(sectionId);
    }
}

// Mostrar notificación toast
function showNotification(title, message) {
    // Implementación simple de notificación
    console.log(`${title}: ${message}`);
}

// Inicialización del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar animación de escritura
    typeWriterEffect();
    
    initializeAccessibility();
    initializeAnimations();
    initializeModuleCards();
    
    // Cargar datos desde Firestore
    loadNewsFromFirestore();
    loadRewardsFromFirestore();
    
    // Actualizar contador de noticias periódicamente
    setInterval(updateNewsCounter, 5000);
    
    console.log('🐺 Wolf Space v2.0 - Sistema inicializado');
    console.log('🔥 Firestore conectado - Datos en sincronización');
});

// Configurar accesibilidad
function initializeAccessibility() {
    // Soporte de teclado para elementos clickeables
    const clickableElements = document.querySelectorAll('[role="button"]');
    
    clickableElements.forEach(element => {
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });
    
    // Cerrar modales/secciones con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openDialogs = document.querySelectorAll('.dialog-backdrop.show');
            openDialogs.forEach(dialog => closeDialog(dialog.id));
            const openSections = document.querySelectorAll('.app-section-backdrop.show');
            openSections.forEach(section => closeSection(section.id));
        }
    });
}

// Animaciones de entrada
function initializeAnimations() {
    // Animación de fade in suave
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.6s ease';
        document.body.style.opacity = '1';
    });
}

// Efectos para las tarjetas de módulos
function initializeModuleCards() {
    const moduleCards = document.querySelectorAll('.module-card:not(.locked)');
    
    moduleCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const icon = card.querySelector('.module-icon img');
            if (icon) {
                icon.style.transform = 'scale(1.1)';
                icon.style.transition = 'transform 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            const icon = card.querySelector('.module-icon img');
            if (icon) {
                icon.style.transform = 'scale(1)';
            }
        });
    });
}
