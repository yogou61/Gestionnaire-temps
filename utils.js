// app/js/utils.js

// Créer un espace de noms global pour les utilitaires de l'application
window.AppUtils = window.AppUtils || {};
window.appUtilsReadyState = window.appUtilsReadyState || 'loading'; // Nouvel indicateur d'état
console.log('Module Utilitaires (v2.5 - Robustesse Accrue) en cours de chargement...');

/**
 * Affiche une notification toast.
 * @param {string} message - Le message à afficher.
 * @param {string} type - Le type de toast (success, error, info, warning).
 * @param {number} duration - La durée d'affichage en millisecondes.
 */
AppUtils.showToast = function(message, type = 'info', duration = 3000) {
    try {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.warn('[AppUtils.showToast] Élément #toast-container non trouvé. Utilisation de alert().');
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease-out';
            
            setTimeout(() => {
                if (toast.parentNode === container) {
                     container.removeChild(toast);
                }
            }, 500); 
        }, duration);
    } catch (e) {
        console.error("[AppUtils.showToast] Erreur inattendue:", e);
        alert(`${type.toUpperCase()} (erreur interne toast): ${message}`);
    }
};

/**
 * Convertit un objet Date en une chaîne de date au format YYYY-MM-DD.
 * @param {Date} dateObject - L'objet Date à convertir.
 * @returns {string|null} La date formatée ou null si l'entrée est invalide.
 */
AppUtils.dateToYYYYMMDD = function(dateObject) {
    if (!(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
        // console.warn("[AppUtils.dateToYYYYMMDD] Entrée invalide:", dateObject);
        return null;
    }
    try {
        const year = dateObject.getFullYear();
        const month = (dateObject.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObject.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("[AppUtils.dateToYYYYMMDD] Erreur de formatage:", e, "pour l'objet Date:", dateObject);
        return null;
    }
};

/**
 * Analyse une chaîne de date YYYY-MM-DD et retourne un objet Date (interprété comme UTC).
 * @param {string} dateString - La chaîne de date à analyser (format YYYY-MM-DD).
 * @returns {Date|null} L'objet Date ou null si la chaîne est invalide.
 */
AppUtils.parseYYYYMMDD = function(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        // console.warn("[AppUtils.parseYYYYMMDD] Entrée invalide (non-string ou null):", dateString);
        return null;
    }
    const parts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) {
        // console.warn("[AppUtils.parseYYYYMMDD] Format de chaîne de date incorrect:", dateString);
        return null;
    }
    try {
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // Mois 0-indexé pour le constructeur Date
        const day = parseInt(parts[3], 10);
        
        const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        // Vérification de validité (ex: 2023-02-30 serait invalide)
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
            // console.warn("[AppUtils.parseYYYYMMDD] Date invalide après construction (ex: jour inexistant):", dateString);
            return null;
        }
        return date;
    } catch (e) {
        console.error("[AppUtils.parseYYYYMMDD] Erreur d'analyse:", e, "pour la chaîne:", dateString);
        return null;
    }
};


/**
 * Calcule la date de Pâques pour une année donnée (algorithme de Meeus/Jones/Butcher).
 * @param {number} year - L'année pour laquelle calculer Pâques.
 * @returns {{month: number, day: number}|null} Un objet avec le mois (1-12) et le jour, ou null.
 */
AppUtils.calculateEaster = function(year) {
    if (typeof year !== 'number' || isNaN(year) || year < 1583 || year > 4099) {
        console.error("[AppUtils.calculateEaster] Année invalide ou hors plage (1583-4099). Année fournie:", year);
        return null;
    }
    try {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31); // Mois 1-indexé (1=Jan, ...)
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return { month: month, day: day };
    } catch (e) {
        console.error("[AppUtils.calculateEaster] Erreur de calcul:", e, "pour l'année:", year);
        return null;
    }
};

/**
 * Retourne un tableau des jours fériés français pour une année donnée.
 * Chaque élément du tableau est un objet { name: string, date: string (YYYY-MM-DD) }.
 * @param {number} year - L'année pour laquelle obtenir les jours fériés.
 * @returns {Array<{name: string, date: string}>} Un tableau d'objets de jours fériés (peut être vide).
 */
AppUtils.getFrenchHolidays = function(year) {
    // console.log(`[AppUtils.getFrenchHolidays] Appel pour l'année ${year}`);
    if (typeof year !== 'number' || isNaN(year) || year < 1900 || year > 2100) {
        console.error(`[AppUtils.getFrenchHolidays] Année invalide fournie : ${year}. Retourne un tableau vide.`);
        return []; // Toujours retourner un tableau
    }

    const holidays = [];
    let easterDateObj = null; // Pour stocker l'objet Date de Pâques

    try {
        const easterInfo = AppUtils.calculateEaster(year);
        if (easterInfo && typeof easterInfo.month === 'number' && typeof easterInfo.day === 'number') {
            // Le mois de calculateEaster est 1-indexé, Date attend 0-indexé
            easterDateObj = new Date(Date.UTC(year, easterInfo.month - 1, easterInfo.day));
            if (isNaN(easterDateObj.getTime())) { // Vérifier si la date est valide
                console.error(`[AppUtils.getFrenchHolidays] Date de Pâques invalide calculée pour ${year}:`, easterInfo);
                easterDateObj = null; // Invalider si la date n'est pas bonne
            }
        } else {
            console.warn(`[AppUtils.getFrenchHolidays] Informations de Pâques non disponibles ou invalides pour ${year}.`);
        }
    } catch (e) {
        console.error(`[AppUtils.getFrenchHolidays] Erreur lors de l'appel à calculateEaster pour ${year}:`, e);
        easterDateObj = null;
    }

    // Jours fériés fixes (créés avec UTC pour éviter les problèmes de fuseau)
    holidays.push({ name: "Jour de l'An", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 0, 1))) });
    holidays.push({ name: "Fête du Travail", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 4, 1))) });
    holidays.push({ name: "Victoire 1945", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 4, 8))) });
    holidays.push({ name: "Fête Nationale", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 6, 14))) });
    holidays.push({ name: "Assomption", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 7, 15))) });
    holidays.push({ name: "Toussaint", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 10, 1))) });
    holidays.push({ name: "Armistice 1918", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 10, 11))) });
    holidays.push({ name: "Noël", date: AppUtils.dateToYYYYMMDD(new Date(Date.UTC(year, 11, 25))) });

    // Jours fériés mobiles, seulement si easterDateObj est une date valide
    if (easterDateObj) {
        try {
            const lundiPaques = new Date(easterDateObj);
            lundiPaques.setUTCDate(lundiPaques.getUTCDate() + 1);
            holidays.push({ name: "Lundi de Pâques", date: AppUtils.dateToYYYYMMDD(lundiPaques) });

            const ascension = new Date(easterDateObj);
            ascension.setUTCDate(ascension.getUTCDate() + 39);
            holidays.push({ name: "Ascension", date: AppUtils.dateToYYYYMMDD(ascension) });

            const lundiPentecote = new Date(easterDateObj);
            lundiPentecote.setUTCDate(lundiPentecote.getUTCDate() + 50);
            holidays.push({ name: "Lundi de Pentecôte", date: AppUtils.dateToYYYYMMDD(lundiPentecote) });
        } catch (e) {
            console.error(`[AppUtils.getFrenchHolidays] Erreur lors du calcul des jours fériés mobiles (décalages de Pâques) pour ${year}:`, e);
        }
    }
    
    const validHolidays = holidays.filter(h => h.date !== null && h.date !== undefined);
    validHolidays.sort((a, b) => a.date.localeCompare(b.date));
    
    // console.log(`[AppUtils.getFrenchHolidays] Jours fériés finaux retournés pour ${year} (taille: ${validHolidays.length}):`, validHolidays);
    return validHolidays; // Toujours retourner un tableau
};

AppUtils.hexToRgba = function(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return hex;
    let c = hex.substring(1).split('');
    if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    if (c.length !== 6) return hex; // Pourrait être plus strict et retourner null ou une erreur
    try {
        const cInt = parseInt(c.join(''), 16);
        const r = (cInt >> 16) & 255;
        const g = (cInt >> 8) & 255;
        const b = cInt & 255;
        return `rgba(${r},${g},${b},${alpha})`;
    } catch (e) {
        console.error("[AppUtils.hexToRgba] Erreur de conversion:", e, "pour hex:", hex);
        return hex; // Retourne l'original en cas d'erreur
    }
};

AppUtils.getISODate = function(date = new Date()) {
    return AppUtils.dateToYYYYMMDD(date);
};

AppUtils.formatDuration = function(durationMs) {
    if (typeof durationMs !== 'number' || isNaN(durationMs) || durationMs < 0) {
        return '00:00';
    }
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

AppUtils.getWeekRange = function(date = new Date()) {
    try {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay(); // Dimanche = 0, Lundi = 1 ..
        const diffToMonday = (day === 0) ? -6 : 1 - day;
        const weekStart = new Date(d);
        weekStart.setUTCDate(d.getUTCDate() + diffToMonday);
        // Heures déjà à 00:00:00.000 UTC par Date.UTC

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999); // Fin de journée UTC

        // Calcul du numéro de semaine ISO 8601
        const target = new Date(weekStart.valueOf());
        const dayNr = (weekStart.getUTCDay() + 6) % 7; 
        target.setUTCDate(target.getUTCDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setUTCMonth(0, 1);
        if (target.getUTCDay() !== 4) {
            target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
        }
        const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);

        return { weekStart, weekEnd, weekNumber, year: weekStart.getUTCFullYear() };
    } catch (e) {
        console.error("[AppUtils.getWeekRange] Erreur de calcul:", e, "pour date:", date);
        // Retourner une valeur par défaut ou null en cas d'erreur
        const todayForError = new Date();
        return { weekStart: todayForError, weekEnd: todayForError, weekNumber: 0, year: todayForError.getFullYear() };
    }
};

console.log('Module Utilitaires (v2.5 - Robustesse Accrue) chargé et fonctions prêtes dans AppUtils.');
window.appUtilsReadyState = 'ready';
document.dispatchEvent(new CustomEvent('appUtilsReady'));