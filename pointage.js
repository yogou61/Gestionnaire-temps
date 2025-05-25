// app/js/pointage.js (Version V17.2 - State+Event Driven)

function attemptInitializePointageModule() {
    if (window.appUtilsReadyState === 'ready') {
        console.log('[Pointage] AppUtils est déjà prêt. Initialisation immédiate.');
        initializePointageModule();
    } else {
        console.log('[Pointage] AppUtils pas encore prêt. Attente de l\'événement appUtilsReady.');
        document.addEventListener('appUtilsReady', initializePointageModuleOnce);
    }
}

// Pour s'assurer que l'initialisation ne se fait qu'une fois
let pointageInitialized = false;
function initializePointageModuleOnce() {
    if (pointageInitialized) return;
    pointageInitialized = true;
    document.removeEventListener('appUtilsReady', initializePointageModuleOnce); // Nettoyer l'écouteur
    console.log('[Pointage] Événement appUtilsReady reçu (ou état vérifié). Initialisation du module.');
    initializePointageModule();
}


async function initializePointageModule() {
    // Le reste de votre fonction initializePointageModule de la version précédente
    // (avec les vérifications de dépendances, les sélecteurs DOM, la logique, etc.)
    // Exemple :
    const pointagePageIdentifier = document.getElementById('btnStartMorning');
    if (!pointagePageIdentifier) {
        // console.log('[Pointage] Pas sur la page de pointage, module non activé.');
        return; 
    }
    console.log('[Pointage] Module Pointage (Simplifié V17.2) fonction initializePointageModule exécutée.');

    if (typeof localforage === 'undefined' || 
        typeof window.AppUtils === 'undefined' ||
        typeof AppUtils.formatDuration !== 'function' ||
        typeof AppUtils.getISODate !== 'function' ||
        typeof AppUtils.getWeekRange !== 'function' ||
        typeof AppUtils.showToast !== 'function') {
        console.error("[Pointage] Dépendances manquantes (localforage ou AppUtils/fonctions).");
        // ... (gestion d'erreur) ...
        return;
    }
    console.log('[Pointage] Dépendances vérifiées et présentes.');

    // Déclarations des éléments DOM (copiez-les de votre version précédente)
    const currentDateEl = document.getElementById('currentDateDisplay');
    // ... et tous les autres ...
    const importJsonInput = document.getElementById('importJsonInput');


    // Vérification des éléments DOM critiques
    // ... (copiez votre bloc de vérification DOM)

    // Variables et fonctions internes du module pointage
    // ... (copiez currentDayState, PUNCH_HISTORY_KEY, etc.)
    // ... (copiez _initializeOrLoadDayStateInternal, saveCurrentDayState, etc.)
    // ... jusqu'à la fin de la logique d'initialisation.
    // N'oubliez pas d'appeler les fonctions comme :
    // await _initializeOrLoadDayStateInternal();
    // _loadWeekSummaryInternal();
    // _setupPointageEventListenersInternal(); // Si vous avez regroupé les listeners

    console.log("[Pointage] Initialisation complète du module Pointage V17.2.");
}

// Démarrer la tentative d'initialisation
// Si le DOM est déjà chargé quand ce script s'exécute :
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptInitializePointageModule);
} else {
    attemptInitializePointageModule(); // DOM déjà prêt
}