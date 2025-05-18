// app/js/pointage.js (Version V17 - Avec fonctionnalités d'import/export JSON - Correction)
document.addEventListener('DOMContentLoaded', async () => {
    // Identifier si on est bien sur la page de pointage
    const pointagePageIdentifier = document.getElementById('btnStartMorning');
    if (!pointagePageIdentifier) {
        console.log('Pas sur la page de pointage, module non activé.');
        return; // Ne pas exécuter ce script si l'élément n'existe pas
    }
    console.log('Module Pointage (Simplifié V17) chargé et initialisé.');

    // Vérifier les dépendances critiques (utils.js, localforage, showToast)
    if (typeof localforage === 'undefined' || typeof formatDuration !== 'function' ||
        typeof getISODate !== 'function' || typeof getWeekRange !== 'function' ||
        typeof showToast !== 'function') {
        console.error("Dépendances manquantes (localforage, utils.js ou showToast).");
        // Afficher un message d'erreur visible si showToast est disponible
        if (typeof showToast === 'function') showToast("Erreur critique de l'application: dépendances manquantes.", "error", 10000);
        // Tenter d'afficher l'erreur dans un élément si possible
        const statusElement = document.getElementById('morningStartTimeDisplay');
        if (statusElement) statusElement.textContent = "Erreur critique.";
        return; // Arrêter l'exécution si les dépendances sont manquantes
    }

    // Éléments DOM
    const currentDateEl = document.getElementById('currentDateDisplay');
    const currentTimeEl = document.getElementById('currentTimeDisplay');
    const btnStartDay = document.getElementById('btnStartMorning');
    const btnEndDay = document.getElementById('btnEndAfternoon'); // Reste le même ID
    const dayStartTimeDispEl = document.getElementById('morningStartTimeDisplay'); // Reste le même ID
    const dayEndTimeDispEl = document.getElementById('afternoonEndTimeDisplay'); // Reste le même ID
    const elapsedTimeTodayEl = document.getElementById('elapsedTimeToday');
    const weekSummaryEl = document.getElementById('weekSummary');
    
    // Éléments pour import/export JSON
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const importJsonInput = document.getElementById('importJsonInput');

    // Variables de fonctionnement
    let timerInterval = null;
    // L'état du jour local ne stocke PLUS les pauses
    let currentDayState = {
        date: null,
        dayStart: null,
        dayEnd: null
    };
    // La clé d'historique est mise à jour pour refléter le format simplifié et éviter les conflits
    const PUNCH_HISTORY_KEY = 'punchHistory_v5_simple_dayOnly'; // Nouvelle clé
    const CURRENT_DAY_STATE_KEY = 'currentDayState_v5_simple_dayOnly'; // Nouvelle clé

    function getDefaultDayState(dateISO) {
        return {
            date: dateISO,
            dayStart: null,
            dayEnd: null
        };
    }

    async function initializeOrLoadDayState() {
        const today = getISODate(new Date());
        try {
            // Charger l'état local du jour (pour les boutons et l'affichage 'aujourd'hui')
            const savedState = await localforage.getItem(CURRENT_DAY_STATE_KEY);

            if (savedState && savedState.date === today) {
                 currentDayState = savedState;
            } else {
                 // Si pas d'état sauvé pour aujourd'hui, ou si l'état est ancien
                 // On vérifie si un punch "dayEnd" a été enregistré pour aujourd'hui dans l'historique global
                 // Cela couvre le cas où l'utilisateur a fermé/rouvert l'app après avoir fini la journée
                 const history = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
                 const todayRecord = history.find(record => record.date === today);

                 if (todayRecord && todayRecord.dayEnd) {
                     // La journée est déjà terminée selon l'historique
                     currentDayState = {
                         date: today,
                         dayStart: todayRecord.dayStart,
                         dayEnd: todayRecord.dayEnd
                     };
                 } else if (todayRecord && todayRecord.dayStart) {
                     // La journée a commencé mais n'est pas finie selon l'historique
                      currentDayState = {
                         date: today,
                         dayStart: todayRecord.dayStart,
                         dayEnd: null // S'assurer que dayEnd est null si pas dans l'historique
                     };
                 }
                 else {
                    // Pas d'état local ni d'historique pour aujourd'hui
                    currentDayState = getDefaultDayState(today);
                 }
                 // On sauvegarde l'état initial de la journée une fois déterminé
                 await saveCurrentDayState();
            }

            updateUIBasedOnState();
            console.log("État du jour chargé:", JSON.parse(JSON.stringify(currentDayState)));

        } catch (err) {
            console.error("Erreur chargement état journée:", err);
            // Si une erreur survient, on initialise à l'état par défaut pour aujourd'hui
            currentDayState = getDefaultDayState(today);
             if(typeof showToast === 'function') showToast("Erreur chargement état pointage.", "error");
        }
    }

    async function saveCurrentDayState() {
        try {
            await localforage.setItem(CURRENT_DAY_STATE_KEY, currentDayState);
             console.log("État du jour sauvegardé localement:", JSON.parse(JSON.stringify(currentDayState)));
        } catch (err) {
            console.error("Erreur sauvegarde état journée locale:", err);
             if(typeof showToast === 'function') showToast("Erreur sauvegarde état pointage local.", "error");
        }
    }

    // Calculer la durée écoulée ou totale de la journée
    function calculateDurationsAndTimes(state) {
        if (!state || !state.date) return { elapsedTimeMs: 0, formattedElapsed: '00:00', isActive: false };

        let now = new Date();
        // Ensure date objects are created from ISO strings
        const dayStartDate = state.dayStart ? new Date(state.dayStart) : null;
        const dayEndDate = state.dayEnd ? new Date(state.dayEnd) : null;

        let elapsedTimeMs = 0;
        let isActive = false;

        // Si la journée est commencée mais pas terminée
        if (dayStartDate && !dayEndDate) {
            elapsedTimeMs = now.getTime() - dayStartDate.getTime();
            isActive = true;
        }
        // Si la journée est terminée
        else if (dayStartDate && dayEndDate) {
            elapsedTimeMs = dayEndDate.getTime() - dayStartDate.getTime();
        }

        // Garantir que le temps écoulé n'est jamais négatif
        elapsedTimeMs = Math.max(0, elapsedTimeMs);

        return {
            elapsedTimeMs,
            formattedElapsed: formatDuration(elapsedTimeMs),
            isActive
        };
    }

    // Mettre à jour l'interface utilisateur
    function updateUIBasedOnState() {
        const today = getISODate(new Date());
         // S'assurer que l'état affiché est bien celui d'aujourd'hui
        if (!currentDayState || currentDayState.date !== today) {
             // Si l'état ne correspond pas à aujourd'hui, afficher des valeurs par défaut
            dayStartTimeDispEl.textContent = '--:--';
            dayEndTimeDispEl.textContent = '--:--';
            btnStartDay.disabled = false;
            btnEndDay.disabled = true;
            elapsedTimeTodayEl.textContent = '00:00';
             // Arrêter le timer s'il y en a un
             if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return; // Sortir si l'état n'est pas pour aujourd'hui
        }


        // Mettre à jour les affichages des heures de pointage
        dayStartTimeDispEl.textContent = currentDayState.dayStart
            ? new Date(currentDayState.dayStart).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
            : '--:--';

        dayEndTimeDispEl.textContent = currentDayState.dayEnd
            ? new Date(currentDayState.dayEnd).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
            : '--:--';

        // Activer/désactiver les boutons selon l'état
        // Le bouton "Début Journée" est désactivé si dayStart existe
        btnStartDay.disabled = !!currentDayState.dayStart;
        // Le bouton "Fin Journée" est désactivé si dayStart n'existe PAS ou si dayEnd existe
        btnEndDay.disabled = !currentDayState.dayStart || !!currentDayState.dayEnd;

        // Calculer et afficher le temps écoulé
        const { formattedElapsed, isActive } = calculateDurationsAndTimes(currentDayState);
        elapsedTimeTodayEl.textContent = formattedElapsed;

        // Si actif, définir un intervalle pour mettre à jour le temps écoulé
        // Vérifier si on est bien sur le jour en cours avant de lancer le timer
        if (isActive && !timerInterval && currentDayState.date === today) {
            timerInterval = setInterval(() => {
                const { formattedElapsed } = calculateDurationsAndTimes(currentDayState);
                elapsedTimeTodayEl.textContent = formattedElapsed;
            }, 30000); // Mise à jour chaque 30 secondes
        } else if (!isActive && timerInterval) {
            // Si plus actif ou si le jour a changé, arrêter le timer
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Gérer un punch (début ou fin de journée)
    async function punch(type) {
        const today = getISODate(new Date());
        // S'assurer qu'on pointe bien pour aujourd'hui
        if (!currentDayState || currentDayState.date !== today) {
            console.warn("Tentative de pointage pour un jour différent ou état invalide.");
             if(typeof showToast === 'function') showToast("Erreur: Impossible de pointer pour un jour différent.", "warning");
            await initializeOrLoadDayState(); // Tenter de recharger l'état correct
            return;
        }

        const now = new Date();
        let message = "";

        try {
            if (type === 'dayStart') {
                if (currentDayState.dayStart) {
                     if(typeof showToast === 'function') showToast("Journée déjà commencée.", "info");
                    return; // Empêcher double pointage
                }
                currentDayState.dayStart = now.toISOString();
                message = "Début de journée enregistré";
            } else if (type === 'dayEnd') {
                if (!currentDayState.dayStart) {
                     if(typeof showToast === 'function') showToast("Veuillez pointer le début de journée d'abord.", "warning");
                    return; // Ne peut pas finir si pas commencé
                }
                 if (currentDayState.dayEnd) {
                     if(typeof showToast === 'function') showToast("Journée déjà terminée.", "info");
                    return; // Empêcher double pointage
                }
                currentDayState.dayEnd = now.toISOString();
                message = "Fin de journée enregistrée";
                // Finaliser et sauvegarder dans l'historique global APRÈS avoir mis à jour l'état local
                 await finalizeDayAndSaveToHistory(currentDayState); // Passer l'état actuel
            }

            await saveCurrentDayState(); // Sauvegarder l'état local (dayStart/dayEnd pour aujourd'hui)
            updateUIBasedOnState(); // Mettre à jour l'UI en fonction de l'état local

             if(typeof showToast === 'function') showToast(message, "success");

        } catch (err) {
            console.error(`Erreur pointage (${type}):`, err);
            if(typeof showToast === 'function') showToast(`Erreur pointage ${type}`, "error");
        }
    }

     // Finaliser et sauvegarder l'enregistrement du jour dans l'historique global
    async function finalizeDayAndSaveToHistory(dayStateToSave) {
        if (!dayStateToSave || !dayStateToSave.dayStart || !dayStateToSave.dayEnd) {
            console.error("Tentative de finalisation sans début ou fin de journée.");
            return;
        }

        const { dayStart, dayEnd, date } = dayStateToSave;
        let totalWorkMs = 0;

         // Calculate total duration only if both start and end exist and are valid
        try {
             const start = new Date(dayStart);
             const end = new Date(dayEnd);
             if (end > start) {
                 totalWorkMs = end.getTime() - start.getTime();
             }
        } catch (e) {
             console.error("Erreur calcul durée finalisée:", e);
             totalWorkMs = 0;
        }


        const dayRecord = {
            date: date, // Utiliser la date de l'état, pas 'today' (même si c'est censé être aujourd'hui)
            dayStart: dayStart,
            dayEnd: dayEnd,
            totalWorkMs: Math.max(0, totalWorkMs) // Store calculated total work
             // Observations are now ONLY in detailed timesheet data, not here
        };

        try {
            let history = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            const existingIndex = history.findIndex(item => item.date === dayRecord.date);

            if (existingIndex > -1) {
                // Update existing record for the day
                history[existingIndex] = dayRecord;
            } else {
                // Add new record for the day
                history.push(dayRecord);
            }

             // Sort history by date to keep it organized (optional but good practice)
             history.sort((a, b) => new Date(a.date) - new Date(b.date));

            await localforage.setItem(PUNCH_HISTORY_KEY, history);
            console.log("Journée finalisée et sauvegardée dans l'historique global:", JSON.parse(JSON.stringify(dayRecord)));

             // After saving to history, update the week summary display
            loadWeekSummary();

        } catch (err) {
            console.error("Erreur finalisation journée et sauvegarde historique:", err);
            if(typeof showToast === 'function') showToast("Erreur sauvegarde historique pointage.", "error");
        }
    }


    // Charger et afficher le résumé de la semaine (somme des totalWorkMs de l'historique)
    async function loadWeekSummary() {
        try {
            const history = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            const today = new Date();
            const weekStart = new Date(today);
            // Calculate Monday of the current week (ISO week date standard)
            const day = (today.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
            weekStart.setDate(today.getDate() - day);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Sunday
            weekEnd.setHours(23, 59, 59, 999);

            // Filtrer les enregistrements de cette semaine
            const weekRecords = history.filter(record => {
                // Ensure record date is treated as UTC start of day for comparison
                const recordDate = new Date(record.date);
                 // Adjust recordDate to be comparable to weekStart/weekEnd (which are local time)
                 // Option 1: Convert weekStart/weekEnd to UTC. Option 2: Adjust recordDate to local TZ start of day.
                 // Given getISODate returns YYYY-MM-DD (which Date() parses as UTC), let's convert weekStart/weekEnd to UTC start of day.
                 const recordDateLocalStart = new Date(record.date);
                 recordDateLocalStart.setHours(0,0,0,0);


                return recordDateLocalStart >= weekStart && recordDateLocalStart <= weekEnd;
            });

            // Calculer le temps total de la semaine
            let weekTotalWorkMs = weekRecords.reduce((total, record) => {
                 // Ensure totalWorkMs is a number
                 return total + (record.totalWorkMs || 0);
            }, 0);

            weekSummaryEl.textContent = formatDuration(weekTotalWorkMs);
        } catch (err) {
            console.error("Erreur chargement résumé semaine:", err);
            weekSummaryEl.textContent = "--:--";
        }
    }

    // Mettre à jour l'affichage de l'horloge en temps réel
    function updateClock() {
        const now = new Date();
        currentDateEl.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        currentTimeEl.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Mettre à jour le temps écoulé si la journée est active et que c'est aujourd'hui
        const today = getISODate(new Date());
        if (currentDayState && currentDayState.date === today && currentDayState.dayStart && !currentDayState.dayEnd) {
             const { formattedElapsed } = calculateDurationsAndTimes(currentDayState);
             elapsedTimeTodayEl.textContent = formattedElapsed;
        }
    }

    // ===== FONCTIONS D'IMPORT/EXPORT JSON =====

    // Fonction pour exporter les pointages en JSON
    async function exportPointagesToJSON() {
        try {
            // Récupérer l'historique des pointages
            const punchHistory = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
            
            // Créer un objet de données à exporter
            const exportData = {
                version: "1.0",
                exportDate: new Date().toISOString(),
                dataType: "pointages",
                punchHistory: punchHistory
            };
            
            // Convertir en JSON
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Créer un Blob et un lien pour télécharger
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Créer un élément <a> temporaire pour le téléchargement
            const a = document.createElement('a');
            a.href = url;
            
            // Générer un nom de fichier avec la date actuelle
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download = `pointages_export_${dateStr}.json`;
            
            // Ajouter à la page, cliquer dessus, puis le supprimer
            document.body.appendChild(a);
            a.click();
            
            // Petit délai avant de nettoyer
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            if (typeof showToast === 'function') {
                showToast("Export des pointages réussi", "success");
            }
            
        } catch (err) {
            console.error("Erreur lors de l'export des pointages:", err);
            if (typeof showToast === 'function') {
                showToast("Erreur lors de l'export des pointages", "error");
            }
        }
    }

    // Fonction pour importer les pointages depuis un fichier JSON
    async function importPointagesFromJSON(file) {
        try {
            // Lire le fichier
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    // Parser le JSON
                    const importData = JSON.parse(event.target.result);
                    
                    // Vérifier si le format est correct
                    if (!importData || !importData.dataType || importData.dataType !== "pointages" || !Array.isArray(importData.punchHistory)) {
                        throw new Error("Format de fichier incorrect");
                    }
                    
                    // Vérifier chaque entrée pour s'assurer qu'elle a le bon format
                    const validRecords = importData.punchHistory.filter(record => {
                        return record && 
                               record.date && 
                               record.dayStart && 
                               record.dayEnd && 
                               typeof record.totalWorkMs === 'number';
                    });
                    
                    if (validRecords.length === 0) {
                        throw new Error("Aucun enregistrement valide trouvé dans le fichier");
                    }
                    
                    // Demander confirmation avant l'import
                    const confirmation = confirm(`Vous êtes sur le point d'importer ${validRecords.length} enregistrements de pointage. Cette action remplacera vos données existantes. Voulez-vous continuer?`);
                    
                    if (!confirmation) {
                        if (typeof showToast === 'function') {
                            showToast("Import annulé", "info");
                        }
                        return;
                    }
                    
                    // Sauvegarder dans localforage
                    await localforage.setItem(PUNCH_HISTORY_KEY, validRecords);
                    
                    // Mettre à jour l'interface utilisateur
                    await initializeOrLoadDayState(); // Recharger l'état du jour
                    await loadWeekSummary(); // Mettre à jour le résumé de la semaine
                    
                    if (typeof showToast === 'function') {
                        showToast(`${validRecords.length} enregistrements de pointage importés avec succès`, "success");
                    }
                    
                } catch (parseErr) {
                    console.error("Erreur lors du parsing du fichier JSON:", parseErr);
                    if (typeof showToast === 'function') {
                        showToast("Erreur: Format de fichier JSON invalide", "error");
                    }
                }
            };
            
            reader.onerror = () => {
                console.error("Erreur lors de la lecture du fichier");
                if (typeof showToast === 'function') {
                    showToast("Erreur lors de la lecture du fichier", "error");
                }
            };
            
            // Lire le fichier comme texte
            reader.readAsText(file);
            
        } catch (err) {
            console.error("Erreur lors de l'import des pointages:", err);
            if (typeof showToast === 'function') {
                showToast("Erreur lors de l'import des pointages", "error");
            }
        }
    }

    // ===== INITIALISATION DES ÉCOUTEURS D'ÉVÉNEMENTS =====

    // Attachement des écouteurs d'événements principaux pour les boutons de pointage
    if (btnStartDay) {
        btnStartDay.addEventListener('click', () => punch('dayStart'));
        console.log("Écouteur attaché au bouton de début de journée");
    } else {
        console.error("Bouton de début de journée introuvable");
    }
    
    if (btnEndDay) {
        btnEndDay.addEventListener('click', () => punch('dayEnd'));
        console.log("Écouteur attaché au bouton de fin de journée");
    } else {
        console.error("Bouton de fin de journée introuvable");
    }

    // Attachement des écouteurs d'événements pour les boutons d'import/export
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportPointagesToJSON);
        console.log("Écouteur attaché au bouton d'export JSON");
    } else {
        console.warn("Bouton d'export JSON introuvable");
    }
    
    if (importJsonBtn && importJsonInput) {
        // Quand on clique sur le bouton, on clique sur l'input file caché
        importJsonBtn.addEventListener('click', () => {
            importJsonInput.click();
        });
        
        // Quand un fichier est sélectionné, on l'importe
        importJsonInput.addEventListener('change', (event) => {
            if (event.target.files && event.target.files.length > 0) {
                const file = event.target.files[0];
                if (file.type === "application/json" || file.name.endsWith('.json')) {
                    importPointagesFromJSON(file);
                } else {
                    if (typeof showToast === 'function') {
                        showToast("Erreur: Le fichier doit être au format JSON", "error");
                    }
                }
                // Réinitialiser l'input pour permettre la sélection du même fichier à nouveau
                event.target.value = '';
            }
        });
        console.log("Écouteurs attachés pour l'import JSON");
    } else {
        console.warn("Éléments d'import JSON introuvables");
    }

    // Initialisation de la page
    // On lance l'horloge immédiatement
    updateClock();
    // On met à jour l'horloge chaque seconde (ou moins souvent pour performance)
    setInterval(updateClock, 1000); // Update clock display every second

    // Puis on charge l'état du jour et le résumé de la semaine
    await initializeOrLoadDayState();
    loadWeekSummary();
    
    console.log("Initialisation complète du module Pointage V17");
});