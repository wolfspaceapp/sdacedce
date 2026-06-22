// ═══════════════════════════════════════════════════════
// WOLF SPACE - Admin Panel JavaScript
// ═══════════════════════════════════════════════════════

let codesData = [];
let rewardsData = [];
let newsData = [];
let unreadNewsCount = 0;
const viewedNewsIds = new Set(JSON.parse(localStorage.getItem('viewedNewsIds') || '[]'));

// ─── TAB SWITCHING ───────────────────────────────────────

function switchTab(tabName) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Si cambia a la pestaña de noticias, marcar como vistas
    if (tabName === 'news') {
        markAllNewsAsViewed();
    }
}

// ─── NEWS NOTIFICATION SYSTEM ─────────────────────────────

function updateNewsNotificationBadge() {
    const unreadCount = newsData.filter(n => n.active && !viewedNewsIds.has(n.id)).length;
    const badge = document.getElementById('news-badge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
    
    unreadNewsCount = unreadCount;
}

function markAllNewsAsViewed() {
    newsData.forEach(news => {
        if (news.active) {
            viewedNewsIds.add(news.id);
        }
    });
    localStorage.setItem('viewedNewsIds', JSON.stringify([...viewedNewsIds]));
    updateNewsNotificationBadge();
}

function markNewsAsViewed(newsId) {
    viewedNewsIds.add(newsId);
    localStorage.setItem('viewedNewsIds', JSON.stringify([...viewedNewsIds]));
    updateNewsNotificationBadge();
}

function showNewsDetail(newsId) {
    const news = newsData.find(n => n.id === newsId);
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
    const safeTitle = news.title.replace(/"/g, '&quot;');
    const safeText = news.text.replace(/"/g, '&quot;');
    
    document.getElementById('detail-icon').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    
    // Agregar título con botón de copiar
    const titleContainer = document.getElementById('detail-title');
    titleContainer.innerHTML = `
        <div class="detail-value-wrapper" style="display: inline-flex; align-items: center; gap: 8px; width: 100%;">
            <div style="flex: 1;">${news.title}</div>
            <button class="detail-copy-btn" data-copy="${safeTitle}" title="Copiar título">
                <i class="fa-solid fa-copy"></i>
            </button>
        </div>
    `;
    
    document.getElementById('detail-time').textContent = news.timestamp ? getTimeAgo(news.timestamp) : 'Hace un momento';
    
    // Agregar texto con botón de copiar
    const textContainer = document.getElementById('detail-text');
    textContainer.innerHTML = `
        <div class="detail-value-wrapper" style="display: flex; align-items: flex-start; gap: 8px;">
            <div style="flex: 1;">${news.text}</div>
            <button class="detail-copy-btn" data-copy="${safeText}" title="Copiar texto">
                <i class="fa-solid fa-copy"></i>
            </button>
        </div>
    `;
    
    openModal('news-detail-modal');
    markNewsAsViewed(newsId);
    
    // Agregar event listeners a los botones de copiar después de abrir el modal
    setTimeout(() => {
        document.querySelectorAll('#news-detail-modal .detail-copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-copy');
                copyToClipboardAdmin(text);
            });
        });
    }, 50);
}

// ─── LOAD DATA FROM FIRESTORE ────────────────────────────

async function loadCodes() {
    try {
        const { collection, getDocs, query, orderBy } = window.firestoreModules;
        const q = query(collection(window.db, 'redeem_codes'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        codesData = [];
        snapshot.forEach(doc => {
            codesData.push({ id: doc.id, ...doc.data() });
        });
        
        renderCodes();
        updateStats();
        console.log(`✅ ${codesData.length} códigos cargados`);
    } catch (error) {
        console.error('Error al cargar códigos:', error);
        document.getElementById('codes-tbody').innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <h3>Error al cargar códigos</h3>
                    <p>${error.message}</p>
                </td>
            </tr>
        `;
    }
}

async function loadRewards() {
    try {
        const { collection, getDocs } = window.firestoreModules;
        const snapshot = await getDocs(collection(window.db, 'rewards'));
        
        rewardsData = [];
        snapshot.forEach(doc => {
            rewardsData.push({ id: doc.id, ...doc.data() });
        });
        
        renderRewards();
        console.log(`✅ ${rewardsData.length} recompensas cargadas`);
    } catch (error) {
        console.error('Error al cargar recompensas:', error);
        const rewardsTbody = document.getElementById('rewards-tbody');
        if (rewardsTbody) {
            rewardsTbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <h3>Error al cargar recompensas</h3>
                        <p>${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

async function loadNews() {
    try {
        const { collection, getDocs, query, orderBy } = window.firestoreModules;
        const q = query(collection(window.db, 'news'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        
        newsData = [];
        snapshot.forEach(doc => {
            newsData.push({ id: doc.id, ...doc.data() });
        });
        
        renderNews();
        updateStats();
        updateNewsNotificationBadge();
        console.log(`✅ ${newsData.length} noticias cargadas`);
    } catch (error) {
        console.error('Error al cargar noticias:', error);
        document.getElementById('news-tbody').innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <h3>Error al cargar noticias</h3>
                    <p>${error.message}</p>
                </td>
            </tr>
        `;
    }
}

// ─── RENDER DATA ──────────────────────────────────────────

function renderCodes() {
    const tbody = document.getElementById('codes-tbody');
    
    if (codesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fa-solid fa-ticket"></i>
                    <h3>No hay códigos registrados</h3>
                    <p>Agrega tu primer código de canje</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = codesData.map(code => {
        const status = code.used ? 
            '<span class="status-badge used"><i class="fa-solid fa-times"></i> Usado</span>' :
            '<span class="status-badge available"><i class="fa-solid fa-check"></i> Disponible</span>';
        
        const expDate = code.expirationDate ? 
            new Date(code.expirationDate.seconds * 1000).toLocaleDateString('es-ES') : 
            'Sin expiración';
        
        // Mostrar valor o detalles según el tipo
        let valueDisplay = code.rewardValue || '1';
        if (code.rewardType === 'subscription') {
            valueDisplay = `<small style="color: #3b82f6;">${code.credentials?.service || 'Suscripción'}</small>`;
        } else if (code.rewardType === 'redeem_data') {
            valueDisplay = `<small style="color: #f59e0b;">Datos</small>`;
        } else if (code.rewardType === 'access_code') {
            valueDisplay = `<small style="color: #10b981;">Acceso</small>`;
        }
        
        return `
            <tr data-id="${code.id}">
                <td><span class="code-display">${code.code}</span></td>
                <td>${code.rewardName}</td>
                <td>${formatType(code.rewardType)}</td>
                <td>${valueDisplay}</td>
                <td>${status}</td>
                <td>${expDate}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-secondary btn-icon" onclick="viewCodeDetails('${code.id}')" title="Ver">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-secondary btn-icon" onclick="editCode('${code.id}')" title="Editar">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-icon" onclick="deleteCode('${code.id}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderRewards() {
    const tbody = document.getElementById('rewards-tbody');
    
    if (!tbody) return; // Skip if element doesn't exist
    
    if (rewardsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fa-solid fa-gift"></i>
                    <h3>No hay recompensas registradas</h3>
                    <p>Agrega tu primera recompensa</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = rewardsData.map(reward => {
        const status = reward.active ? 
            '<span class="status-badge active"><i class="fa-solid fa-check"></i> Activa</span>' :
            '<span class="status-badge inactive"><i class="fa-solid fa-times"></i> Inactiva</span>';
        
        return `
            <tr data-id="${reward.id}">
                <td style="font-size: 24px;">${reward.icon}</td>
                <td>${reward.name}</td>
                <td>${truncate(reward.description, 50)}</td>
                <td>${formatType(reward.type)}</td>
                <td>${reward.value}</td>
                <td>${status}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-secondary btn-icon" onclick="editReward('${reward.id}')" title="Editar">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-icon" onclick="deleteReward('${reward.id}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderNews() {
    const tbody = document.getElementById('news-tbody');
    
    if (newsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-newspaper"></i>
                    <h3>No hay noticias registradas</h3>
                    <p>Agrega tu primera noticia</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = newsData.map(news => {
        const status = news.active ? 
            '<span class="status-badge active"><i class="fa-solid fa-check"></i> Activa</span>' :
            '<span class="status-badge inactive"><i class="fa-solid fa-times"></i> Inactiva</span>';
        
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
        
        // Calcular tiempo relativo automáticamente
        const timeAgo = news.timestamp ? getTimeAgo(news.timestamp) : 'Hace un momento';
        
        // Indicador de no vista
        const unreadBadge = !viewedNewsIds.has(news.id) && news.active ? 
            '<span class="notification-badge" style="margin-left: 8px;">1</span>' : '';
        
        return `
            <tr data-id="${news.id}">
                <td>${news.title}${unreadBadge}</td>
                <td>${truncate(news.text, 50)}</td>
                <td style="font-size: 20px; color: #a3a3a3;"><i class="fa-solid ${iconClass}"></i></td>
                <td>${timeAgo}</td>
                <td>${status}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-secondary btn-icon" onclick="showNewsDetail('${news.id}')" title="Ver">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-secondary btn-icon" onclick="editNews('${news.id}')" title="Editar">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-icon" onclick="deleteNews('${news.id}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Función auxiliar para calcular tiempo relativo
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Hace un momento';
    
    const now = new Date();
    const newsDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
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

// ─── UPDATE STATS ─────────────────────────────────────────

function updateStats() {
    const totalCodesEl = document.getElementById('stat-total-codes');
    const availableCodesEl = document.getElementById('stat-available-codes');
    const totalNewsEl = document.getElementById('stat-total-news');
    
    if (totalCodesEl) totalCodesEl.textContent = codesData.length;
    if (availableCodesEl) availableCodesEl.textContent = codesData.filter(c => !c.used).length;
    if (totalNewsEl) totalNewsEl.textContent = newsData.filter(n => n.active).length;
}

// ─── MODAL FUNCTIONS ──────────────────────────────────────

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ─── CODE CRUD ────────────────────────────────────────────

function toggleRewardFields() {
    const type = document.getElementById('code-reward-type').value;
    
    // Ocultar todos los campos especiales (con verificación de existencia)
    const subscriptionFields = document.getElementById('subscription-fields');
    const redeemDataFields = document.getElementById('redeem-data-fields');
    const accessCodeFields = document.getElementById('access-code-fields');
    
    // Ocultar todos primero
    if (subscriptionFields) subscriptionFields.style.display = 'none';
    if (redeemDataFields) redeemDataFields.style.display = 'none';
    if (accessCodeFields) accessCodeFields.style.display = 'none';
    
    // Mostrar campos según el tipo
    if (type === 'subscription' && subscriptionFields) {
        subscriptionFields.style.display = 'block';
    } else if (type === 'redeem_data' && redeemDataFields) {
        redeemDataFields.style.display = 'block';
    } else if (type === 'access_code' && accessCodeFields) {
        accessCodeFields.style.display = 'block';
    }
}

function openAddCodeModal() {
    document.getElementById('code-modal-title').textContent = 'Agregar Código';
    document.getElementById('code-form').reset();
    document.getElementById('code-id').value = '';
    toggleRewardFields();
    openModal('code-modal');
}

function editCode(id) {
    const code = codesData.find(c => c.id === id);
    if (!code) return;
    
    document.getElementById('code-modal-title').textContent = 'Editar Código';
    document.getElementById('code-id').value = code.id;
    document.getElementById('code-code').value = code.code;
    document.getElementById('code-reward-name').value = code.rewardName;
    document.getElementById('code-reward-type').value = code.rewardType;
    
    // Cargar campos según el tipo
    if (code.rewardType === 'subscription' && code.credentials) {
        const serviceEl = document.getElementById('code-subscription-service');
        const emailEl = document.getElementById('code-subscription-email');
        const passwordEl = document.getElementById('code-subscription-password');
        const pinEl = document.getElementById('code-subscription-pin');
        const profileEl = document.getElementById('code-subscription-profile');
        
        if (serviceEl) serviceEl.value = code.credentials.service || '';
        if (emailEl) emailEl.value = code.credentials.email || '';
        if (passwordEl) passwordEl.value = code.credentials.password || '';
        if (pinEl) pinEl.value = code.credentials.pin || '';
        if (profileEl) profileEl.value = code.credentials.profileNumber || '';
    } else if (code.rewardType === 'redeem_data') {
        const redeemDataEl = document.getElementById('code-redeem-data');
        if (redeemDataEl) redeemDataEl.value = code.redeemData || '';
    } else if (code.rewardType === 'access_code') {
        const accessValueEl = document.getElementById('code-access-value');
        const accessDescEl = document.getElementById('code-access-description');
        if (accessValueEl) accessValueEl.value = code.accessCodeValue || '';
        if (accessDescEl) accessDescEl.value = code.accessCodeDescription || '';
    }
    
    if (code.expirationDate) {
        const date = new Date(code.expirationDate.seconds * 1000);
        document.getElementById('code-expiration').value = date.toISOString().split('T')[0];
    }
    
    toggleRewardFields();
    openModal('code-modal');
}

// Ver detalles del código en un modal de solo lectura
function viewCodeDetails(id) {
    const code = codesData.find(c => c.id === id);
    if (!code) return;
    
    const typeIcons = {
        'subscription': 'fa-tv',
        'redeem_data': 'fa-clipboard-list',
        'access_code': 'fa-key',
        'coins': 'fa-coins',
        'content': 'fa-film'
    };
    
    const iconClass = typeIcons[code.rewardType] || 'fa-gift';
    const expDate = code.expirationDate ? 
        new Date(code.expirationDate.seconds * 1000).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : 'Sin fecha de expiración';
    
    const status = code.used ? 'Usado' : 'Disponible';
    const statusColor = code.used ? '#ef4444' : '#10b981';
    
    // Contenido específico según el tipo
    let detailsContent = '';
    
    if (code.rewardType === 'subscription' && code.credentials) {
        detailsContent = `
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-server"></i> Servicio</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value">${code.credentials.service}</div>
                    <button class="detail-copy-btn" data-copy="${code.credentials.service}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-envelope"></i> Email</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value">${code.credentials.email}</div>
                    <button class="detail-copy-btn" data-copy="${code.credentials.email}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-key"></i> Contraseña</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value" style="font-family: 'Courier New', monospace;">${code.credentials.password}</div>
                    <button class="detail-copy-btn" data-copy="${code.credentials.password}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            ${code.credentials.pin ? `
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-lock"></i> PIN</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value">${code.credentials.pin}</div>
                    <button class="detail-copy-btn" data-copy="${code.credentials.pin}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            ` : ''}
            ${code.credentials.profileNumber ? `
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-user-circle"></i> Perfil</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value">${code.credentials.profileNumber}</div>
                    <button class="detail-copy-btn" data-copy="${code.credentials.profileNumber}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            ` : ''}
        `;
    } else if (code.rewardType === 'redeem_data') {
        const safeData = code.redeemData.replace(/"/g, '&quot;');
        detailsContent = `
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-info-circle"></i> Datos</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value" style="white-space: pre-wrap;">${code.redeemData}</div>
                    <button class="detail-copy-btn" data-copy="${safeData}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
    } else if (code.rewardType === 'access_code') {
        detailsContent = `
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-key"></i> Código de Acceso</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value" style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700;">${code.accessCodeValue}</div>
                    <button class="detail-copy-btn" data-copy="${code.accessCodeValue}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            ${code.accessCodeDescription ? `
            <div class="detail-field">
                <div class="detail-label"><i class="fa-solid fa-info-circle"></i> Descripción</div>
                <div class="detail-value-wrapper">
                    <div class="detail-value">${code.accessCodeDescription}</div>
                    <button class="detail-copy-btn" data-copy="${code.accessCodeDescription}" title="Copiar">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
            ` : ''}
        `;
    }
    
    // Crear modal
    let modal = document.getElementById('code-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'code-detail-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #a3a3a3;">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <h2>Detalles del Código</h2>
                </div>
            </div>
            <div class="modal-body">
                <div class="detail-field">
                    <div class="detail-label"><i class="fa-solid fa-ticket"></i> Código</div>
                    <div class="detail-value-wrapper">
                        <div class="detail-value" style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px;">${code.code}</div>
                        <button class="detail-copy-btn" data-copy="${code.code}" title="Copiar">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="detail-field">
                    <div class="detail-label"><i class="fa-solid fa-gift"></i> Recompensa</div>
                    <div class="detail-value-wrapper">
                        <div class="detail-value">${code.rewardName}</div>
                        <button class="detail-copy-btn" data-copy="${code.rewardName}" title="Copiar">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="detail-field">
                    <div class="detail-label"><i class="fa-solid fa-tag"></i> Tipo</div>
                    <div class="detail-value">${formatType(code.rewardType)}</div>
                </div>
                
                ${detailsContent}
                
                <div class="detail-field">
                    <div class="detail-label"><i class="fa-solid fa-circle-info"></i> Estado</div>
                    <div class="detail-value" style="color: ${statusColor}; font-weight: 600;">${status}</div>
                </div>
                
                <div class="detail-field">
                    <div class="detail-label"><i class="fa-solid fa-calendar"></i> Expiración</div>
                    <div class="detail-value">${expDate}</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="close-code-detail">Cerrar</button>
            </div>
        </div>
    `;
    
    openModal('code-detail-modal');
    
    setTimeout(() => {
        document.getElementById('close-code-detail')?.addEventListener('click', () => {
            closeModal('code-detail-modal');
        });
        
        // Agregar event listeners a los botones de copiar
        document.querySelectorAll('#code-detail-modal .detail-copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-copy');
                copyToClipboardAdmin(text);
            });
        });
    }, 50);
}

// Función para copiar al portapapeles en admin panel
function copyToClipboardAdmin(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Copiado al portapapeles', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('✓ Copiado al portapapeles', 'success');
    });
}

async function saveCode() {
    const id = document.getElementById('code-id').value;
    const code = document.getElementById('code-code').value.trim().toUpperCase();
    const rewardName = document.getElementById('code-reward-name').value.trim();
    const rewardType = document.getElementById('code-reward-type').value;
    const expiration = document.getElementById('code-expiration').value;
    
    if (!code || !rewardName || !rewardType) {
        showToast('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    
    // Validar código duplicado
    const isDuplicate = codesData.some(c => c.code === code && c.id !== id);
    if (isDuplicate) {
        showToast('⚠️ Este código ya existe. No se permiten duplicados.', 'error');
        return;
    }
    
    const { collection, addDoc, updateDoc, doc, Timestamp } = window.firestoreModules;
    
    const codeData = {
        code,
        rewardName,
        rewardType,
        used: false,
        usedAt: null,
        usedBy: null,
        expirationDate: expiration ? Timestamp.fromDate(new Date(expiration)) : null
    };
    
    // Solo agregar createdAt al crear un nuevo código
    if (!id) {
        codeData.createdAt = Timestamp.now();
    }
    
    // Agregar campos según el tipo de recompensa
    if (rewardType === 'subscription') {
        const service = document.getElementById('code-subscription-service').value.trim();
        const email = document.getElementById('code-subscription-email').value.trim();
        const password = document.getElementById('code-subscription-password').value.trim();
        const pin = document.getElementById('code-subscription-pin').value.trim();
        const profile = document.getElementById('code-subscription-profile').value.trim();
        
        if (!service || !email || !password) {
            showToast('Por favor completa servicio, correo y contraseña', 'error');
            return;
        }
        
        codeData.credentials = { service, email, password };
        if (pin) codeData.credentials.pin = pin;
        if (profile) codeData.credentials.profileNumber = profile;
        codeData.rewardValue = 1;
        
    } else if (rewardType === 'redeem_data') {
        const redeemData = document.getElementById('code-redeem-data').value.trim();
        
        if (!redeemData) {
            showToast('Por favor ingresa los datos de canje', 'error');
            return;
        }
        
        codeData.redeemData = redeemData;
        codeData.rewardValue = 1;
        
    } else if (rewardType === 'access_code') {
        const accessValue = document.getElementById('code-access-value').value.trim().toUpperCase();
        const accessDesc = document.getElementById('code-access-description').value.trim();
        
        if (!accessValue) {
            showToast('Por favor ingresa el código de acceso', 'error');
            return;
        }
        
        codeData.accessCodeValue = accessValue;
        if (accessDesc) codeData.accessCodeDescription = accessDesc;
        codeData.rewardValue = 1;
    } else {
        // Tipo genérico
        codeData.rewardValue = 1;
    }
    
    try {
        if (id) {
            await updateDoc(doc(window.db, 'redeem_codes', id), codeData);
            showToast('Código actualizado exitosamente', 'success');
        } else {
            await addDoc(collection(window.db, 'redeem_codes'), codeData);
            showToast('Código agregado exitosamente', 'success');
        }
        
        closeModal('code-modal');
        loadCodes();
    } catch (error) {
        console.error('Error al guardar código:', error);
        showToast('Error al guardar código: ' + error.message, 'error');
    }
}

async function deleteCode(id) {
    if (!confirm('¿Estás seguro de eliminar este código?')) return;
    
    const { deleteDoc, doc } = window.firestoreModules;
    
    try {
        await deleteDoc(doc(window.db, 'redeem_codes', id));
        showToast('Código eliminado exitosamente', 'success');
        loadCodes();
    } catch (error) {
        console.error('Error al eliminar código:', error);
        showToast('Error al eliminar código: ' + error.message, 'error');
    }
}

// ─── REWARD CRUD ──────────────────────────────────────────

function openAddRewardModal() {
    document.getElementById('reward-modal-title').textContent = 'Agregar Recompensa';
    document.getElementById('reward-form').reset();
    document.getElementById('reward-id').value = '';
    document.getElementById('reward-active').value = 'true';
    openModal('reward-modal');
}

function editReward(id) {
    const reward = rewardsData.find(r => r.id === id);
    if (!reward) return;
    
    document.getElementById('reward-modal-title').textContent = 'Editar Recompensa';
    document.getElementById('reward-id').value = reward.id;
    document.getElementById('reward-name').value = reward.name;
    document.getElementById('reward-description').value = reward.description;
    document.getElementById('reward-icon').value = reward.icon;
    document.getElementById('reward-color').value = reward.color;
    document.getElementById('reward-type').value = reward.type;
    document.getElementById('reward-value').value = reward.value;
    document.getElementById('reward-active').value = reward.active.toString();
    
    openModal('reward-modal');
}

async function saveReward() {
    const id = document.getElementById('reward-id').value;
    const name = document.getElementById('reward-name').value.trim();
    const description = document.getElementById('reward-description').value.trim();
    const icon = document.getElementById('reward-icon').value.trim();
    const color = document.getElementById('reward-color').value;
    const type = document.getElementById('reward-type').value;
    const value = parseInt(document.getElementById('reward-value').value);
    const active = document.getElementById('reward-active').value === 'true';
    
    if (!name || !description || !icon || !color || !type || !value) {
        showToast('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    
    const { collection, addDoc, updateDoc, doc } = window.firestoreModules;
    
    const rewardData = {
        name,
        description,
        icon,
        color,
        type,
        value,
        active
    };
    
    try {
        if (id) {
            await updateDoc(doc(window.db, 'rewards', id), rewardData);
            showToast('Recompensa actualizada exitosamente', 'success');
        } else {
            await addDoc(collection(window.db, 'rewards'), rewardData);
            showToast('Recompensa agregada exitosamente', 'success');
        }
        
        closeModal('reward-modal');
        loadRewards();
    } catch (error) {
        console.error('Error al guardar recompensa:', error);
        showToast('Error al guardar recompensa: ' + error.message, 'error');
    }
}

async function deleteReward(id) {
    if (!confirm('¿Estás seguro de eliminar esta recompensa?')) return;
    
    const { deleteDoc, doc } = window.firestoreModules;
    
    try {
        await deleteDoc(doc(window.db, 'rewards', id));
        showToast('Recompensa eliminada exitosamente', 'success');
        loadRewards();
    } catch (error) {
        console.error('Error al eliminar recompensa:', error);
        showToast('Error al eliminar recompensa: ' + error.message, 'error');
    }
}

// ─── NEWS CRUD ────────────────────────────────────────────

function openAddNewsModal() {
    document.getElementById('news-modal-title').textContent = 'Agregar Noticia';
    document.getElementById('news-form').reset();
    document.getElementById('news-id').value = '';
    document.getElementById('news-active').value = 'true';
    updateIconPreview(); // Actualizar vista previa
    openModal('news-modal');
}

function editNews(id) {
    const news = newsData.find(n => n.id === id);
    if (!news) return;
    
    document.getElementById('news-modal-title').textContent = 'Editar Noticia';
    document.getElementById('news-id').value = news.id;
    document.getElementById('news-title').value = news.title;
    document.getElementById('news-text').value = news.text;
    document.getElementById('news-icon').value = news.icon;
    document.getElementById('news-active').value = news.active.toString();
    
    updateIconPreview(); // Actualizar vista previa
    openModal('news-modal');
}

// Actualizar vista previa del icono
function updateIconPreview() {
    const iconSelect = document.getElementById('news-icon');
    const iconPreview = document.getElementById('icon-preview');
    
    if (!iconSelect || !iconPreview) return;
    
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
    
    const selectedIcon = iconSelect.value;
    if (selectedIcon && iconMap[selectedIcon]) {
        iconPreview.innerHTML = `<i class="fa-solid ${iconMap[selectedIcon]}"></i>`;
    } else {
        iconPreview.innerHTML = '';
    }
}

// Agregar event listener al selector de iconos
document.addEventListener('DOMContentLoaded', () => {
    const iconSelect = document.getElementById('news-icon');
    if (iconSelect) {
        iconSelect.addEventListener('change', updateIconPreview);
    }
});

async function saveNews() {
    const id = document.getElementById('news-id').value;
    const title = document.getElementById('news-title').value.trim();
    const text = document.getElementById('news-text').value.trim();
    const icon = document.getElementById('news-icon').value;
    const active = document.getElementById('news-active').value === 'true';
    
    if (!title || !text || !icon) {
        showToast('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    
    const { collection, addDoc, updateDoc, doc, Timestamp } = window.firestoreModules;
    
    const newsDataToSave = {
        title,
        text,
        icon,
        active
    };
    
    // Solo agregar timestamp al crear una nueva noticia
    if (!id) {
        newsDataToSave.timestamp = Timestamp.now();
    }
    
    try {
        if (id) {
            await updateDoc(doc(window.db, 'news', id), newsDataToSave);
            showToast('Noticia actualizada exitosamente', 'success');
        } else {
            await addDoc(collection(window.db, 'news'), newsDataToSave);
            showToast('Noticia agregada exitosamente', 'success');
        }
        
        closeModal('news-modal');
        loadNews();
    } catch (error) {
        console.error('Error al guardar noticia:', error);
        showToast('Error al guardar noticia: ' + error.message, 'error');
    }
}

async function deleteNews(id) {
    if (!confirm('¿Estás seguro de eliminar esta noticia?')) return;
    
    const { deleteDoc, doc } = window.firestoreModules;
    
    try {
        await deleteDoc(doc(window.db, 'news', id));
        showToast('Noticia eliminada exitosamente', 'success');
        loadNews();
    } catch (error) {
        console.error('Error al eliminar noticia:', error);
        showToast('Error al eliminar noticia: ' + error.message, 'error');
    }
}

// ─── UTILITY FUNCTIONS ────────────────────────────────────

function formatType(type) {
    const types = {
        'subscription': '📺 Suscripción',
        'redeem_data': '📋 Datos Canje',
        'access_code': '🔐 Acceso',
        'coins': '🪙 Monedas',
        'content': '🎬 Contenido'
    };
    return types[type] || type;
}

function truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fa-solid ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function filterTable(type) {
    const searchValue = document.getElementById(`search-${type}`).value.toLowerCase();
    const tbody = document.getElementById(`${type}-tbody`);
    const rows = tbody.querySelectorAll('tr[data-id]');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

// ─── CLOSE MODAL ON BACKGROUND CLICK ─────────────────────

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// ─── MOBILE OPTIMIZATIONS ─────────────────────────────────

// Detectar scroll en tablas y ocultar indicador
document.querySelectorAll('.data-table').forEach(table => {
    table.addEventListener('scroll', function() {
        if (this.scrollLeft > 10) {
            this.classList.add('scrolled');
        }
    }, { passive: true });
});

// Mejorar rendimiento de scroll en móvil
if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
}

console.log('🐺 Admin Panel cargado - Listo para gestionar');
