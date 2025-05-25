// pointage.js
console.log('Module Pointage chargé.');

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('currentDate')) return; // S'assurer qu'on est sur la bonne page

    const currentDateEl = document.getElementById('currentDate');
    const currentTimeEl = document.getElementById('currentTime');
    const btnStartDay = document.getElementById('btnStartDay');
    const btnEndDay = document.getElementById('btnEndDay');
    const dayStatusEl = document.getElementById('dayStatus');
    const elapsedTimeEl = document.getElementById('elapsedTime');
    const weekSummaryEl = document.getElementById('weekSummary');

    let timerInterval = null;
    let startTime = null;

    function updateClock() {
        const now = new Date();
        if (currentDateEl) currentDateEl.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (currentTimeEl) currentTimeEl.textContent = now.toLocaleTimeString('fr-FR');

        if (startTime) {
            const diff = now - startTime;
            const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            if (elapsedTimeEl) elapsedTimeEl.textContent = `${h}:${m}:${s}`;
        }
    }

    if (btnStartDay) {
        btnStartDay.addEventListener('click', () => {
            if (!startTime) {
                startTime = new Date();
                // TODO: Sauvegarder startTime (localstorage ou backend)
                localStorage.setItem('dayStartTime', startTime.toISOString());
                dayStatusEl.textContent = `Commencée à ${startTime.toLocaleTimeString('fr-FR')}`;
                elapsedTimeEl.textContent = '00:00:00';
                btnStartDay.disabled = true;
                btnEndDay.disabled = false;
                console.log('Journée commencée :', startTime);
                alert('Journée commencée !');
            }
        });
    }

    if (btnEndDay) {
        btnEndDay.addEventListener('click', () => {
            if (startTime) {
                const endTime = new Date();
                // TODO: Sauvegarder endTime et calculer le total (localstorage ou backend)
                localStorage.removeItem('dayStartTime'); // Nettoyer pour le prochain jour
                // Calculer le temps total pour la journée et sauvegarder
                const duration = endTime - startTime;
                console.log('Journée terminée :', endTime, 'Durée:', duration / 1000 / 60, 'minutes');
                dayStatusEl.textContent = 'Terminée';
                startTime = null; // Réinitialiser
                btnStartDay.disabled = false;
                btnEndDay.disabled = true;
                alert('Journée terminée !');
            }
        });
    }

    // Récupérer l'état au chargement
    const savedStartTime = localStorage.getItem('dayStartTime');
    if (savedStartTime) {
        startTime = new Date(savedStartTime);
        dayStatusEl.textContent = `Commencée à ${startTime.toLocaleTimeString('fr-FR')}`;
        btnStartDay.disabled = true;
        btnEndDay.disabled = false;
    } else {
        if (btnEndDay) btnEndDay.disabled = true;
    }

    if (weekSummaryEl) {
        // TODO: Charger le récapitulatif de la semaine
        weekSummaryEl.textContent = 'Récapitulatif hebdomadaire à implémenter.';
    }

    updateClock(); // Premier appel
    setInterval(updateClock, 1000); // Mettre à jour l'horloge chaque seconde
});