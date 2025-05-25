// app/js/pointage.js (Version V18 - Complet avec liaison fiches horaires)

let pointageInitialized = false;

function attemptInitializePointageModule() {
    if (window.appUtilsReadyState === 'ready') {
        console.log('[Pointage] AppUtils est déjà prêt. Initialisation immédiate.');
        initializePointageModule();
    } else {
        console.log('[Pointage] AppUtils pas encore prêt. Attente de l\'événement appUtilsReady.');
        document.addEventListener('appUtilsReady', initializePointageModuleOnce);
    }
}

function initializePointageModuleOnce() {
    if (pointageInitialized) return;
    pointageInitialized = true;
    document.removeEventListener('appUtilsReady', initializePointageModuleOnce);
    console.log('[Pointage] Événement appUtilsReady reçu. Initialisation du module.');
    initializePointageModule();
}

async function initializePointageModule() {
    // Vérification de la page
    const pointagePageIdentifier = document.getElementById('btnStartMorning');
    if (!pointagePageIdentifier) {
        return; 
    }
    console.log('[Pointage] Module Pointage V18 - Initialisation en cours.');

    // Vérification des dépendances
    if (typeof localforage === 'undefined' || 
        typeof window.AppUtils === 'undefined' ||
        typeof AppUtils.formatDuration !== 'function' ||
        typeof AppUtils.getISODate !== 'function' ||
        typeof AppUtils.getWeekRange !== 'function' ||
        typeof AppUtils.showToast !== 'function') {
        console.error("[Pointage] Dépendances manquantes.");
        return;
    }
    console.log('[Pointage] Dépendances vérifiées.');

    // === CONSTANTES ===
    const PUNCH_HISTORY_KEY = 'punchHistory_v5_simple_dayOnly';
    const CURRENT_DAY_STATE_KEY = 'currentDayState_v4';

    // === ÉLÉMENTS DOM ===
    const currentDateEl = document.getElementById('currentDateDisplay');
    const currentTimeEl = document.getElementById('currentTimeDisplay');
    const btnStartMorning = document.getElementById('btnStartMorning');
    const btnEndAfternoon = document.getElementById('btnEndAfternoon');
    const morningStartTimeDisplay = document.getElementById('morningStartTimeDisplay');
    const afternoonEndTimeDisplay = document.getElementById('afternoonEndTimeDisplay');
    const elapsedTimeToday = document.getElementById('elapsedTimeToday');
    const weekSummary = document.getElementById('weekSummary');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const importJsonInput = document.getElementById('importJsonInput');

    // Vérifications DOM avec logs détaillés
    console.log('[Pointage] Vérification des éléments DOM:');
    console.log('- btnStartMorning:', !!btnStartMorning);
    console.log('- btnEndAfternoon:', !!btnEndAfternoon);
    console.log('- elapsedTimeToday:', !!elapsedTimeToday);
    console.log('- weekSummary:', !!weekSummary);
    console.log('- sendEmailBtn:', !!sendEmailBtn);
    
    const requiredElements = [
        { element: btnStartMorning, name: 'btnStartMorning' },
        { element: btnEndAfternoon, name: 'btnEndAfternoon' }
    ];
    
    const missingElements = requiredElements.filter(item => !item.element);
    if (missingElements.length > 0) {
        console.error("[Pointage] Éléments DOM manquants:", missingElements.map(item => item.name));
        AppUtils.showToast(`Erreur: éléments manquants (${missingElements.map(item => item.name).join(', ')})`, "error");
        return;
    }

    // === VARIABLES D'ÉTAT ===
    let currentDayState = {
        date: AppUtils.getISODate(new Date()),
        dayStart: null,
        dayEnd: null,
        status: 'not_started' // not_started, day_active, day_finished
    };

    let updateInterval = null;

    // === FONCTIONS UTILITAIRES ===
    function parseTimeString(timeStr) {
        if (!timeStr) return null;
        const date = new Date(timeStr);
        return isNaN(date.getTime()) ? null : date;
    }

    function formatTimeForDisplay(timeStr) {
        const date = parseTimeString(timeStr);
        if (!date) return '--:--';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    function calculateDuration(startTime, endTime) {
        const start = parseTimeString(startTime);
        const end = parseTimeString(endTime);
        if (!start || !end) return 0;
        return Math.max(0, end.getTime() - start.getTime());
    }

    function getCurrentTimestamp() {
        return new Date().toISOString();
    }

    // === FONCTIONS DE SAUVEGARDE ===
    async function saveCurrentDayState() {
        try {
            await localforage.setItem(CURRENT_DAY_STATE_KEY, currentDayState);
            console.log('[Pointage] État du jour sauvegardé.');
        } catch (err) {
            console.error('[Pointage] Erreur sauvegarde état:', err);
        }
    }

    async function saveToPunchHistory() {
        try {
            const allHistory = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            const todayIndex = allHistory.findIndex(day => day.date === currentDayState.date);
            
            const todayRecord = {
                date: currentDayState.date,
                dayStart: currentDayState.dayStart,
                dayEnd: currentDayState.dayEnd,
                morningStart: currentDayState.dayStart, // Compatibilité avec fiches horaires
                morningEnd: null, // Sera calculé automatiquement par fiches horaires
                afternoonStart: null, // Sera calculé automatiquement par fiches horaires  
                afternoonEnd: currentDayState.dayEnd,
                status: currentDayState.status,
                lastUpdate: getCurrentTimestamp()
            };

            if (todayIndex >= 0) {
                allHistory[todayIndex] = todayRecord;
            } else {
                allHistory.push(todayRecord);
            }

            // Garder seulement les 90 derniers jours
            allHistory.sort((a, b) => b.date.localeCompare(a.date));
            if (allHistory.length > 90) {
                allHistory.splice(90);
            }

            await localforage.setItem(PUNCH_HISTORY_KEY, allHistory);
            console.log('[Pointage] Historique mis à jour.');
        } catch (err) {
            console.error('[Pointage] Erreur sauvegarde historique:', err);
        }
    }

    // === FONCTIONS DE CHARGEMENT ===
    async function loadCurrentDayState() {
        try {
            const today = AppUtils.getISODate(new Date());
            const storedState = await localforage.getItem(CURRENT_DAY_STATE_KEY);
            
            if (storedState && storedState.date === today) {
                currentDayState = { ...currentDayState, ...storedState };
                console.log('[Pointage] État du jour chargé:', currentDayState);
            } else {
                // Nouveau jour, réinitialiser
                currentDayState = {
                    date: today,
                    dayStart: null,
                    dayEnd: null,
                    status: 'not_started'
                };
                await saveCurrentDayState();
                console.log('[Pointage] Nouveau jour initialisé.');
            }
        } catch (err) {
            console.error('[Pointage] Erreur chargement état:', err);
        }
    }

    // === FONCTIONS DE CALCUL ===
    function calculateTodayTotal() {
        if (!currentDayState.dayStart) return 0;
        
        const end = currentDayState.dayEnd || getCurrentTimestamp();
        return calculateDuration(currentDayState.dayStart, end);
    }

    function calculateCurrentSessionDuration() {
        if (currentDayState.status === 'day_active' && currentDayState.dayStart) {
            const now = getCurrentTimestamp();
            return calculateDuration(currentDayState.dayStart, now);
        }
        
        return 0;
    }

    async function calculateWeekTotal() {
        try {
            const today = new Date();
            const todayStr = AppUtils.getISODate(today);
            const weekRange = AppUtils.getWeekRange(today);
            const allHistory = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            
            let weekTotal = 0;
            for (let d = new Date(weekRange.weekStart); d <= weekRange.weekEnd; d.setDate(d.getDate() + 1)) {
                const dateStr = AppUtils.getISODate(d);
                
                // CORRECTION : Exclure aujourd'hui du calcul pour éviter la double comptabilisation
                if (dateStr === todayStr) {
                    continue; // On ne compte pas aujourd'hui ici, il sera ajouté dans updateDisplay()
                }
                
                const dayRecord = allHistory.find(record => record.date === dateStr);
                
                if (dayRecord && dayRecord.dayStart && dayRecord.dayEnd) {
                    const dayDuration = calculateDuration(dayRecord.dayStart, dayRecord.dayEnd);
                    weekTotal += dayDuration;
                }
            }
            
            return weekTotal;
        } catch (err) {
            console.error('[Pointage] Erreur calcul semaine:', err);
            return 0;
        }
    }

    // === FONCTIONS D'AFFICHAGE ===
    async function updateDisplay() {
        // Date et heure actuelles
        if (currentDateEl) {
            currentDateEl.textContent = new Date().toLocaleDateString('fr-FR');
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = new Date().toLocaleTimeString('fr-FR');
        }

        // Affichage des heures de pointage
        if (morningStartTimeDisplay) {
            morningStartTimeDisplay.textContent = formatTimeForDisplay(currentDayState.dayStart);
        }
        
        if (afternoonEndTimeDisplay) {
            afternoonEndTimeDisplay.textContent = formatTimeForDisplay(currentDayState.dayEnd);
        }

        // CORRECTION : Temps de travail aujourd'hui avec session en cours
        let todayTotalMs = 0;
        
        if (currentDayState.status === 'day_finished') {
            // Journée terminée : utiliser le temps total enregistré
            todayTotalMs = calculateTodayTotal();
        } else if (currentDayState.status === 'day_active' && currentDayState.dayStart) {
            // Journée en cours : calculer depuis le début jusqu'à maintenant
            const now = getCurrentTimestamp();
            todayTotalMs = calculateDuration(currentDayState.dayStart, now);
        } else {
            // Pas encore commencé
            todayTotalMs = 0;
        }

        if (elapsedTimeToday) {
            elapsedTimeToday.textContent = AppUtils.formatDuration(todayTotalMs);
        }

        // Total de la semaine (SANS compter aujourd'hui deux fois)
        const weekTotal = await calculateWeekTotal();
        if (weekSummary) {
            // weekTotal contient déjà les jours précédents, on ajoute seulement aujourd'hui
            const totalWeekWithToday = weekTotal + todayTotalMs;
            weekSummary.textContent = AppUtils.formatDuration(totalWeekWithToday);
        }

        // Mise à jour des boutons
        updateButtons();
    }

    function updateButtons() {
        // Reset des boutons
        if (btnStartMorning) {
            btnStartMorning.disabled = true;
            btnStartMorning.classList.remove('btn-success', 'btn-warning', 'btn-danger');
            btnStartMorning.classList.add('btn-secondary');
        }
        
        if (btnEndAfternoon) {
            btnEndAfternoon.disabled = true;
            btnEndAfternoon.classList.remove('btn-success', 'btn-warning', 'btn-danger');
            btnEndAfternoon.classList.add('btn-secondary');
        }

        // Logique d'activation selon le statut
        switch (currentDayState.status) {
            case 'not_started':
                if (btnStartMorning) {
                    btnStartMorning.disabled = false;
                    btnStartMorning.classList.remove('btn-secondary');
                    btnStartMorning.classList.add('btn-success');
                    btnStartMorning.textContent = 'Pointer Début Journée';
                }
                break;
                
            case 'day_active':
                if (btnEndAfternoon) {
                    btnEndAfternoon.disabled = false;
                    btnEndAfternoon.classList.remove('btn-secondary');
                    btnEndAfternoon.classList.add('btn-danger');
                    btnEndAfternoon.textContent = 'Pointer Fin Journée';
                }
                break;
                
            case 'day_finished':
                // Journée terminée, tous les boutons restent désactivés
                if (btnStartMorning) {
                    btnStartMorning.textContent = 'Journée Terminée';
                }
                if (btnEndAfternoon) {
                    btnEndAfternoon.textContent = 'Journée Terminée';
                }
                break;
        }
    }

    // === GESTIONNAIRES D'ÉVÉNEMENTS ===
    async function handleStartMorning() {
        currentDayState.dayStart = getCurrentTimestamp();
        currentDayState.status = 'day_active';
        
        await saveCurrentDayState();
        await saveToPunchHistory();
        updateDisplay();
        
        AppUtils.showToast('Début de journée enregistré', 'success');
        console.log('[Pointage] Début journée:', currentDayState.dayStart);
    }

    async function handleEndAfternoon() {
        currentDayState.dayEnd = getCurrentTimestamp();
        currentDayState.status = 'day_finished';
        
        await saveCurrentDayState();
        await saveToPunchHistory();
        updateDisplay();
        
        // Arrêter les mises à jour
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        
        AppUtils.showToast('Fin de journée enregistrée', 'success');
        console.log('[Pointage] Fin journée:', currentDayState.dayEnd);
    }

    // === EXPORT/IMPORT + EMAIL ===
    async function exportData() {
        try {
            const allHistory = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            const data = {
                punchHistory: allHistory,
                currentDayState: currentDayState,
                exportDate: getCurrentTimestamp(),
                version: 'V18-Simple'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pointage_export_${AppUtils.getISODate(new Date())}.json`;
            a.click();
            URL.revokeObjectURL(url);

            AppUtils.showToast('Export réussi !', 'success');
            return data; // Retourner les données pour l'email
        } catch (err) {
            console.error('[Pointage] Erreur export:', err);
            AppUtils.showToast('Erreur lors de l\'export.', 'error');
            return null;
        }
    }

    async function sendDataByEmail() {
        try {
            const allHistory = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            const data = {
                punchHistory: allHistory,
                currentDayState: currentDayState,
                exportDate: getCurrentTimestamp(),
                version: 'V18-Simple'
            };

            // Préparer le contenu de l'email
            const jsonString = JSON.stringify(data, null, 2);
            const fileName = `pointage_backup_${AppUtils.getISODate(new Date())}.json`;
            
            // Créer un résumé lisible
            const weekTotal = await calculateWeekTotal();
            const todayTotal = calculateTodayTotal();
            const summary = `
Sauvegarde Pointage - ${new Date().toLocaleDateString('fr-FR')}

Résumé:
- Total aujourd'hui: ${AppUtils.formatDuration(todayTotal)}
- Total cette semaine: ${AppUtils.formatDuration(weekTotal)}
- Nombre de jours enregistrés: ${allHistory.length}
- Statut actuel: ${currentDayState.status}

Fichier JSON en pièce jointe: ${fileName}
            `.trim();

            // Encoder le JSON en base64 pour l'URL mailto
            const encodedJson = encodeURIComponent(jsonString);
            const encodedSummary = encodeURIComponent(summary);
            
            // Créer l'URL mailto avec le JSON dans le corps (limité mais fonctionnel)
            const mailtoUrl = `mailto:?subject=${encodeURIComponent('Sauvegarde Pointage - ' + new Date().toLocaleDateString('fr-FR'))}&body=${encodedSummary}%0A%0A--- DONNÉES JSON ---%0A${encodedJson}`;
            
            // Ouvrir le client email
            window.location.href = mailtoUrl;
            
            AppUtils.showToast('Client email ouvert avec les données de sauvegarde', 'success');
            
        } catch (err) {
            console.error('[Pointage] Erreur envoi email:', err);
            AppUtils.showToast('Erreur lors de la préparation de l\'email.', 'error');
        }
    }

    async function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.punchHistory && Array.isArray(data.punchHistory)) {
                await localforage.setItem(PUNCH_HISTORY_KEY, data.punchHistory);
                console.log('[Pointage] Historique importé:', data.punchHistory.length, 'entrées');
            }

            if (data.currentDayState && typeof data.currentDayState === 'object') {
                // Vérifier si c'est pour aujourd'hui
                if (data.currentDayState.date === AppUtils.getISODate(new Date())) {
                    currentDayState = { ...currentDayState, ...data.currentDayState };
                    await saveCurrentDayState();
                }
            }

            await updateDisplay();
            AppUtils.showToast('Import réussi !', 'success');
        } catch (err) {
            console.error('[Pointage] Erreur import:', err);
            AppUtils.showToast('Erreur lors de l\'import. Vérifiez le format du fichier.', 'error');
        }

        event.target.value = '';
    }

    // === CONFIGURATION DES ÉVÉNEMENTS ===
    function setupEventListeners() {
        if (btnStartMorning) {
            btnStartMorning.addEventListener('click', handleStartMorning);
            console.log('[Pointage] Event listener btnStartMorning configuré.');
        }
        
        if (btnEndAfternoon) {
            btnEndAfternoon.addEventListener('click', handleEndAfternoon);
            console.log('[Pointage] Event listener btnEndAfternoon configuré.');
        }

        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', exportData);
            console.log('[Pointage] Event listener export configuré.');
        }

        if (sendEmailBtn) {
            sendEmailBtn.addEventListener('click', sendDataByEmail);
            console.log('[Pointage] Event listener email configuré.');
        }

        if (importJsonBtn && importJsonInput) {
            importJsonBtn.addEventListener('click', () => importJsonInput.click());
            importJsonInput.addEventListener('change', importData);
            console.log('[Pointage] Event listeners import configurés.');
        }

        console.log('[Pointage] Event listeners configurés pour les éléments disponibles.');
    }

    function startAutoUpdate() {
        // Mise à jour de l'heure et du temps écoulé toutes les secondes
        updateInterval = setInterval(async () => {
            // Toujours mettre à jour l'heure
            if (currentTimeEl) {
                currentTimeEl.textContent = new Date().toLocaleTimeString('fr-FR');
            }
            
            // Mise à jour du temps écoulé si journée active
            if (currentDayState.status === 'day_active') {
                // Calcul en temps réel du temps écoulé
                const now = getCurrentTimestamp();
                const todayTotalMs = calculateDuration(currentDayState.dayStart, now);
                
                if (elapsedTimeToday) {
                    elapsedTimeToday.textContent = AppUtils.formatDuration(todayTotalMs);
                }
                
                // Mettre à jour aussi le total semaine
                const weekTotal = await calculateWeekTotal();
                if (weekSummary) {
                    const totalWeekWithToday = weekTotal + todayTotalMs;
                    weekSummary.textContent = AppUtils.formatDuration(totalWeekWithToday);
                }
            }
        }, 1000);
        
        console.log('[Pointage] Auto-update démarré - mise à jour chaque seconde.');
    }

    // === INITIALISATION ===
    try {
        await loadCurrentDayState();
        setupEventListeners();
        await updateDisplay();
        startAutoUpdate();
        
        console.log('[Pointage] Module Pointage V18 initialisé avec succès.');
        AppUtils.showToast('Module de pointage prêt', 'info');
        
    } catch (err) {
        console.error('[Pointage] Erreur initialisation:', err);
        AppUtils.showToast('Erreur initialisation du pointage', 'error');
    }
}

// === POINT D'ENTRÉE ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptInitializePointageModule);
} else {
    attemptInitializePointageModule();
}