// app/js/utils.js
console.log('Module Utilitaires (v2) chargé.'); // Message de chargement clair

/**
 * Formate une durée en millisecondes en HH:MM:SS.
 * @param {number} ms - Durée en millisecondes.
 * @returns {string} - Durée formatée (ex: "08:30:00").
 */
function formatDuration(ms) {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Obtient la date actuelle ou une date donnée au format YYYY-MM-DD (ISO 8601 Date).
 * Utilise l'heure locale pour déterminer la date.
 * @param {Date} [date=new Date()] - L'objet Date à formater. Par défaut, la date et l'heure actuelles.
 * @returns {string} - Date formatée (ex: "2023-10-27").
 */
function getISODate(date = new Date()) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn("getISODate a reçu une date invalide, utilise la date actuelle.", date);
        date = new Date(); // Fallback sur la date actuelle si l'entrée est invalide
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont 0-indexés
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Alias pour getISODate, utilisé pour la cohérence avec le code de html copie.txt.
 * @param {Date} dateObj - L'objet Date à formater.
 * @returns {string} - Date formatée (ex: "2023-10-27").
 */
function dateToYYYYMMDD(dateObj) {
    return getISODate(dateObj); // Délègue à getISODate qui a déjà la gestion d'erreur
}

/**
 * Convertit une chaîne YYYY-MM-DD en objet Date (à minuit, heure locale).
 * @param {string} dateStr - La chaîne de date (ex: "2023-10-27").
 * @returns {Date | null} - L'objet Date ou null si la chaîne est invalide.
 */
function parseYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        console.warn("Format de chaîne de date invalide pour parseYYYYMMDD:", dateStr);
        return null;
    }
    const parts = dateStr.split('-');
    // Le mois est 0-indexé dans le constructeur Date (0 pour Janvier, 11 pour Décembre)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const day = parseInt(parts[2], 10);

    // Vérifier la validité des composants parsés
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn("Composants de date non numériques dans parseYYYYMMDD:", dateStr);
        return null;
    }

    const date = new Date(year, month, day);
    // Vérifier si la date construite correspond aux composants (ex: "2023-02-30" deviendrait Mars)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        console.warn("Date invalide (ex: jour inexistant pour le mois) dans parseYYYYMMDD:", dateStr);
        return null;
    }
    date.setHours(0,0,0,0); // S'assurer qu'elle est à minuit heure locale
    return date; 
}


/**
 * Obtient le début (lundi à 00:00:00) et la fin (dimanche à 23:59:59) de la semaine ISO
 * pour une date donnée, en utilisant l'heure locale.
 * @param {Date} [date=new Date()] - La date pour laquelle trouver la semaine.
 * @returns {{startOfWeek: Date, endOfWeek: Date}}
 */
function getWeekRange(date = new Date()) {
    const d = new Date(date); 
    const dayOfWeek = d.getDay(); 
    const diffToMonday = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { startOfWeek, endOfWeek };
}

/**
 * Convertit une chaîne de temps HH:MM:SS ou HH:MM en millisecondes.
 * @param {string} timeString - ex: "08:30:00" ou "08:30".
 * @returns {number} - Durée en millisecondes, ou 0 si le format est invalide.
 */
function timeStringToMs(timeString) {
    if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return 0;
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Obtient le numéro de semaine ISO 8601 pour une date donnée.
 * @param {Date} date - La date pour laquelle trouver le numéro de semaine.
 * @returns {number} - Le numéro de la semaine ISO (1 à 53).
 */
function getISOWeek(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn("getISOWeek a reçu une date invalide, utilise la date actuelle.", date);
        date = new Date();
    }
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNumber;
}

/**
 * Convertit une chaîne "YYYY-Www" (semaine ISO 8601) en objet Date représentant le lundi de cette semaine.
 * @param {string} weekString - ex: "2023-W42".
 * @returns {Date | null} - Le lundi de cette semaine (à minuit, heure locale), ou null si format invalide.
 */
function getDateFromISOWeek(weekString) {
    if (!weekString || typeof weekString !== 'string' || !weekString.match(/^\d{4}-W\d{1,2}$/)) {
        console.warn("Format de chaîne de semaine invalide pour getDateFromISOWeek:", weekString); return null;
    }
    const parts = weekString.split('-W');
    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
        console.warn("Année ou numéro de semaine invalide:", weekString); return null;
    }
    const fourthOfJan = new Date(year, 0, 4); // Le 4 janvier est toujours dans la semaine 1
    const firstDayOfWeek1 = new Date(fourthOfJan);
    firstDayOfWeek1.setDate(fourthOfJan.getDate() - (fourthOfJan.getDay() === 0 ? 6 : fourthOfJan.getDay() - 1) ); // Lundi de la semaine 1
    const mondayOfWeek = new Date(firstDayOfWeek1);
    mondayOfWeek.setDate(firstDayOfWeek1.getDate() + (week - 1) * 7);
    // Vérification pour s'assurer qu'on est bien dans la bonne semaine et la bonne année
    if (getISOWeek(mondayOfWeek) !== week || mondayOfWeek.getFullYear() !== year) {
        // console.warn(`Ajustement potentiel pour ${weekString}. Calcul initial: ${mondayOfWeek.toDateString()} (S${getISOWeek(mondayOfWeek)} Y${mondayOfWeek.getFullYear()})`);
        // Si la semaine calculée est 1 mais l'année est N+1, on est peut-être tombé sur la semaine 1 de l'année suivante
        // alors qu'on voulait la semaine 52/53 de l'année N. Ou l'inverse.
        // Un ajustement simple consiste à essayer de reculer ou avancer de 7 jours si l'année ne correspond pas.
        if (mondayOfWeek.getFullYear() > year && week < 5) { // Semaine 1-4 mais année N+1 -> probablement S52/53 de N
            mondayOfWeek.setDate(mondayOfWeek.getDate() - 7);
        } else if (mondayOfWeek.getFullYear() < year && week > 50) { // Semaine 50+ mais année N-1 -> probablement S1 de N
            mondayOfWeek.setDate(mondayOfWeek.getDate() + 7);
        }
        // S'assurer que c'est un lundi après ajustement
        const finalDay = mondayOfWeek.getDay();
        const offsetToFinalMonday = (finalDay === 0) ? -6 : 1 - finalDay;
        mondayOfWeek.setDate(mondayOfWeek.getDate() + offsetToFinalMonday);

        if (getISOWeek(mondayOfWeek) !== week || mondayOfWeek.getFullYear() !== year) {
             // console.warn(`Ajustement final n'a pas résolu pour ${weekString}. Résultat: ${mondayOfWeek.toDateString()} (S${getISOWeek(mondayOfWeek)} Y${mondayOfWeek.getFullYear()})`);
             // Pour les cas très limites, une bibliothèque de dates est plus fiable.
        }
    }
    mondayOfWeek.setHours(0, 0, 0, 0);
    return mondayOfWeek;
}

/**
 * Obtient le premier et le dernier jour du mois pour une date donnée (ou le mois actuel).
 * @param {Date} [date=new Date()] - La date pour laquelle trouver le mois.
 * @returns {{startOfMonth: Date, endOfMonth: Date}}
 */
function getMonthRange(date = new Date()) {
    if (!(date instanceof Date) || isNaN(date.getTime())) date = new Date();
    const y = date.getFullYear(); const m = date.getMonth();
    const startOfMonth = new Date(y, m, 1); startOfMonth.setHours(0,0,0,0);
    const endOfMonth = new Date(y, m + 1, 0); endOfMonth.setHours(23,59,59,999);
    return { startOfMonth, endOfMonth };
}

/**
 * Convertit une chaîne "YYYY-MM" en objet Date représentant le premier jour de ce mois.
 * @param {string} monthString - ex: "2023-10".
 * @returns {Date | null} - Le premier jour de ce mois, ou null si format invalide.
 */
function getDateFromMonthString(monthString) {
    if (!monthString || typeof monthString !== 'string' || !monthString.match(/^\d{4}-\d{2}$/)) {
        console.warn("Format de chaîne de mois invalide:", monthString); return null;
    }
    const [year, month] = monthString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        console.warn("Année ou mois invalide:", monthString); return null;
    }
    const date = new Date(year, month - 1, 1); date.setHours(0,0,0,0);
    return date;
}

/**
 * Affiche une notification toast.
 * @param {string} message - Le message à afficher.
 * @param {string} [type='info'] - 'info', 'success', 'warning', 'error'.
 * @param {number} [duration=3500] - Durée en ms avant disparition.
 */
function showToast(message, type = 'info', duration = 3500) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container (#toast-container) non trouvé. Message:', message);
        alert(`${type.toUpperCase()}: ${message}`); return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; // Utiliser className pour remplacer les classes existantes
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10); 
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode === toastContainer) { toastContainer.removeChild(toast); }
        }, { once: true });
    }, duration);
}

/**
 * Calcule les dates clés liées à Pâques pour une année donnée.
 * @param {number} year - L'année pour laquelle calculer Pâques.
 * @returns {{paques: Date, lundiPaques: Date, ascension: Date, lundiPentecote: Date}}
 */
function calculateEaster(year) {
    const a = year % 19; const b = Math.floor(year / 100); const c = year % 100;
    const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); 
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const paques = new Date(year, month - 1, day);
    const lundiPaques = new Date(paques); lundiPaques.setDate(paques.getDate() + 1);
    const ascension = new Date(paques); ascension.setDate(paques.getDate() + 39);
    const lundiPentecote = new Date(paques); lundiPentecote.setDate(paques.getDate() + 50);
    return { paques, lundiPaques, ascension, lundiPentecote };
}

/**
 * Retourne un Set de chaînes de dates (YYYY-MM-DD) pour les jours fériés français de l'année donnée.
 * @param {number} year - L'année pour laquelle obtenir les jours fériés.
 * @returns {Set<string>} - Un Set de dates formatées.
 */
function getFrenchHolidays(year) {
    const holidays = new Set();
    const addHoliday = (dateObj) => {
        if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
            holidays.add(dateToYYYYMMDD(dateObj));
        } else {
            console.warn("Tentative d'ajout d'une date de férié invalide:", dateObj);
        }
    };
    addHoliday(new Date(year, 0, 1)); addHoliday(new Date(year, 4, 1)); 
    addHoliday(new Date(year, 4, 8)); addHoliday(new Date(year, 6, 14));
    addHoliday(new Date(year, 7, 15)); addHoliday(new Date(year, 10, 1));
    addHoliday(new Date(year, 10, 11)); addHoliday(new Date(year, 11, 25));
    const easterDates = calculateEaster(year);
    addHoliday(easterDates.lundiPaques); addHoliday(easterDates.ascension);
    addHoliday(easterDates.lundiPentecote);
    return holidays;
}

/**
 * Convertit une couleur hex en RGBA avec une opacité donnée.
 * @param {string} hex - Couleur hexadécimale (ex: "#RRGGBB" ou "#RGB").
 * @param {number} [alpha=1] - Valeur d'opacité (0 à 1).
 * @returns {string} - Couleur RGBA (ex: "rgba(r,g,b,a)").
 */
function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex; 
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
    else if (hex.length === 7) { r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16); }
    else return hex;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    const validAlpha = Math.min(1, Math.max(0, parseFloat(alpha)));
    return `rgba(${r}, ${g}, ${b}, ${isNaN(validAlpha) ? 1 : validAlpha})`;
}

// Configuration de localForage
if (typeof localforage !== 'undefined') {
    localforage.config({
        name: 'gestionTempsApp', storeName: 'app_data_store',
        description: 'Stockage local pour l\'application de gestion de temps'
    });
} else { console.warn('localForage non défini. Config localForage sautée.'); }

console.log('Module Utilitaires (v2) chargé et fonctions globales prêtes.');