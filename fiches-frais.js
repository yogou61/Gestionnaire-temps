// app/js/fiches-frais.js
document.addEventListener('DOMContentLoaded', async () => {
    const expensePageIdentifier = document.getElementById('expenseReportForm');
    if (!expensePageIdentifier) {
        // console.log('Module Fiches de Frais: Non sur la page, initialisation annulée.');
        return;
    }
    console.log('Module Fiches de Frais (Revu) chargé et initialisé.');

    // Vérification des dépendances
    if (typeof localforage === 'undefined') {
        console.error("localforage n'est pas chargé. Fiches de Frais ne fonctionnera pas.");
        if(typeof showToast === 'function') showToast("Erreur critique: Stockage local manquant.", "error", 10000);
        else alert("Erreur critique: Stockage local manquant.");
        return;
    }
    if (typeof showToast !== 'function' || typeof getISODate !== 'function') {
        console.error("Fonctions de utils.js manquantes (showToast ou getISODate).");
        if(typeof showToast === 'function') showToast("Erreur critique: Fonctions utilitaires manquantes.", "error", 10000);
        else alert("Erreur critique: Fonctions utilitaires manquantes.");
        return;
    }
    // exportToExcel est vérifié au moment de l'appel

    // Références DOM
    const expenseReportForm = document.getElementById('expenseReportForm');
    const reportDateInput = document.getElementById('reportDate');
    const reportStartTimeInput = document.getElementById('reportStartTime');
    const reportEndTimeInput = document.getElementById('reportEndTime');
    const reportLocationsInput = document.getElementById('reportLocations');
    const reportMealsInput = document.getElementById('reportMeals');
    
    const expenseReportsTableBody = document.querySelector('#expenseReportsTable tbody');
    const exportExcelBtn = document.getElementById('exportExcelExpensesBtn');
    const resetExpensesBtn = document.getElementById('resetExpensesBtn');

    // Clé de stockage (versionnée au cas où la structure des données change)
    const EXPENSE_REPORTS_KEY = 'expenseReports_v1.2'; // Mettre à jour si la structure de l'objet report change
    let allExpenseReports = [];

    // --- Initialisation du Module ---
    async function initializeExpenseModule() {
        await loadAllExpenseReports(); // Charger les données existantes
        renderExpenseReportsHistory(); // Afficher l'historique
        setupEventListeners();         // Mettre en place les écouteurs

        // Pré-remplir la date du formulaire avec la date du jour
        if (reportDateInput) {
            reportDateInput.value = getISODate(new Date());
        }
    }

    function setupEventListeners() {
        if (expenseReportForm) {
            expenseReportForm.addEventListener('submit', handleExpenseReportSubmit);
        }
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', handleExportToExcel);
        }
        if (resetExpensesBtn) {
            resetExpensesBtn.addEventListener('click', handleResetExpenses);
        }
    }

    // --- Gestion des Données (LocalForage) ---
    async function loadAllExpenseReports() {
        try {
            const storedReports = await localforage.getItem(EXPENSE_REPORTS_KEY);
            allExpenseReports = Array.isArray(storedReports) ? storedReports : []; // S'assurer que c'est un tableau
        } catch (err) {
            console.error("Erreur lors du chargement des fiches de frais depuis localforage:", err);
            showToast("Erreur de chargement des fiches de frais.", "error");
            allExpenseReports = []; // Fallback sur un tableau vide
        }
    }

    async function saveAllExpenseReports() {
        try {
            // Trier avant de sauvegarder pour une consistance (optionnel mais bien)
            // Les plus récentes en premier si on veut les afficher ainsi sans retrier à chaque fois.
            // Ou trier par date de la fiche pour un ordre chronologique.
            allExpenseReports.sort((a, b) => {
                const dateA = new Date(a.date + "T" + a.startTime);
                const dateB = new Date(b.date + "T" + b.startTime);
                return dateB - dateA; // Plus récentes en premier
            });
            await localforage.setItem(EXPENSE_REPORTS_KEY, allExpenseReports);
        } catch (err) {
            console.error("Erreur lors de la sauvegarde des fiches de frais dans localforage:", err);
            showToast("Erreur lors de la sauvegarde de la fiche de frais.", "error");
        }
    }

    // --- Logique de Création de Fiche de Frais ---
    async function handleExpenseReportSubmit(event) {
        event.preventDefault(); // Empêcher la soumission standard du formulaire

        const date = reportDateInput.value;
        const startTime = reportStartTimeInput.value;
        const endTime = reportEndTimeInput.value;
        const locations = reportLocationsInput.value.trim();
        const meals = parseInt(reportMealsInput.value, 10);

        if (!date || !startTime || !endTime || !locations || isNaN(meals) || meals < 0) {
            showToast("Veuillez remplir tous les champs correctement (repas >= 0).", "warning");
            return;
        }

        // Comparaison des heures (format HH:MM)
        if (endTime < startTime) { 
            showToast("L'heure de fin ne peut pas être antérieure à l'heure de début.", "error");
            return;
        }

        const newReport = {
            id: `er_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, // ID unique plus robuste
            date: date, // Format YYYY-MM-DD
            startTime: startTime, // Format HH:MM
            endTime: endTime,     // Format HH:MM
            locations: locations,
            meals: meals
        };

        allExpenseReports.push(newReport);
        await saveAllExpenseReports(); // Sauvegarde (qui inclut le tri)
        
        showToast("Fiche de frais créée avec succès !", "success");
        expenseReportForm.reset(); // Vider le formulaire
        reportDateInput.value = getISODate(new Date()); // Remettre la date du jour par défaut
        
        renderExpenseReportsHistory(); // Mettre à jour l'affichage du tableau
    }

    // --- Affichage de l'Historique des Fiches de Frais ---
    function renderExpenseReportsHistory() {
        if (!expenseReportsTableBody) return;
        expenseReportsTableBody.innerHTML = ''; // Vider le contenu actuel de la table

        if (allExpenseReports.length === 0) {
            const row = expenseReportsTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6; // Nombre de colonnes dans la table
            cell.textContent = "Aucune fiche de frais enregistrée pour le moment.";
            cell.style.textAlign = "center";
            return;
        }

        // Les données sont déjà triées (plus récentes en premier) par saveAllExpenseReports
        allExpenseReports.forEach(report => {
            const row = expenseReportsTableBody.insertRow();
            
            // Formater la date pour l'affichage
            const displayDate = report.date ? new Date(report.date + "T00:00:00").toLocaleDateString('fr-FR') : 'Date N/A';
            
            row.insertCell().textContent = displayDate;
            row.insertCell().textContent = report.startTime || '-';
            row.insertCell().textContent = report.endTime || '-';
            row.insertCell().textContent = report.locations || '-';
            row.insertCell().textContent = (typeof report.meals === 'number') ? report.meals : '-';
            
            const actionsCell = row.insertCell();
            actionsCell.style.textAlign = 'center'; // Centrer les boutons d'action

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Suppr.';
            deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
            deleteBtn.title = "Supprimer cette fiche de frais";
            deleteBtn.onclick = async () => {
                if (confirm(`Voulez-vous vraiment supprimer la fiche du ${displayDate} ?`)) {
                    allExpenseReports = allExpenseReports.filter(r => r.id !== report.id);
                    await saveAllExpenseReports();
                    showToast("Fiche de frais supprimée.", "info");
                    renderExpenseReportsHistory(); // Rafraîchir la table
                }
            };
            actionsCell.appendChild(deleteBtn);
        });
    }

    // --- Fonctionnalité de Réinitialisation de l'Historique ---
    async function handleResetExpenses() {
        if (allExpenseReports.length === 0) {
            showToast("L'historique est déjà vide.", "info");
            return;
        }
        if (confirm("ATTENTION : Voulez-vous vraiment supprimer TOUTES les fiches de frais ? Cette action est irréversible !")) {
            allExpenseReports = []; // Vider le tableau en mémoire
            try {
                await localforage.removeItem(EXPENSE_REPORTS_KEY); // Supprimer du stockage
                showToast("Historique des fiches de frais réinitialisé.", "info");
                renderExpenseReportsHistory(); // Mettre à jour l'affichage
            } catch (err) {
                console.error("Erreur lors de la réinitialisation des fiches de frais:", err);
                showToast("Une erreur est survenue lors de la réinitialisation.", "error");
            }
        }
    }

    // --- Préparation et Appel de l'Export Excel ---
    function handleExportToExcel() {
        if (typeof exportToExcel !== 'function') {
            showToast("La fonctionnalité d'export Excel n'est pas disponible.", "error");
            console.warn("exportToExcel (dans export.js) n'est pas définie ou export.js n'est pas chargé correctement.");
            return;
        }

        if (allExpenseReports.length === 0) {
            showToast("Aucune fiche de frais à exporter.", "info");
            return;
        }

        const dataForExport = [
            // En-têtes du fichier Excel
            ["Date", "Heure Début", "Heure Fin", "Lieux Visitées", "Nombre de Repas"]
        ];

        // Trier les données pour l'export (par date, du plus ancien au plus récent)
        const sortedReportsForExport = [...allExpenseReports].sort((a,b) => {
            const dateA = new Date(a.date + "T" + a.startTime);
            const dateB = new Date(b.date + "T" + b.startTime);
            return dateA - dateB; // Tri chronologique
        });

        sortedReportsForExport.forEach(report => {
            dataForExport.push([
                report.date ? new Date(report.date + "T00:00:00").toLocaleDateString('fr-FR') : '', // Format de date local
                report.startTime || '',
                report.endTime || '',
                report.locations || '',
                (typeof report.meals === 'number') ? report.meals : ''
            ]);
        });

        const filename = `Fiches_Frais_${getISODate(new Date())}.xlsx`; // Nom de fichier dynamique
        exportToExcel(dataForExport, filename, "Fiches de Frais"); // Appel de la fonction de export.js
    }
    
    // Lancement de l'initialisation du module
    initializeExpenseModule();
});