// app/js/conges.js (Version Rev.15 - Interface Complète - Syntaxe Corrigée)

// Variable globale pour éviter la double initialisation
let congesInitialized = false;

async function initializeCongesModuleActual() {
    // Vérification de l'identifiant de page - on est sur pointage si btnStartMorning existe
    const pointagePageIdentifier = document.getElementById('btnStartMorning');
    if (pointagePageIdentifier) {
        return; 
    }
    
    // Vérifier qu'on est bien sur la page congés
    const congesPageCheck = document.getElementById('congesLegendContainer') || 
                           document.getElementById('saisieAbsencesSection') ||
                           document.querySelector('.conges-layout-grid') ||
                           document.querySelector('.annual-calendar-placeholder');
    if (!congesPageCheck) {
        console.log('[Conges] Pas sur la page de congés, module non activé.');
        return;
    }
    
    console.log('[Conges] Page de congés détectée, initialisation du module.');

    // Vérification des dépendances
    if (typeof localforage === 'undefined' || 
        typeof window.AppUtils === 'undefined' ||
        typeof AppUtils.showToast !== 'function' ||
        typeof AppUtils.dateToYYYYMMDD !== 'function' ||
        typeof AppUtils.parseYYYYMMDD !== 'function' ||
        typeof AppUtils.getFrenchHolidays !== 'function') {
        console.error("[Conges] Dépendances manquantes.");
        AppUtils?.showToast?.("Erreur: dépendances manquantes pour le module Congés.", "error");
        return;
    }
    console.log('[Conges] Dépendances vérifiées et présentes.');

    // Références DOM
    const currentDateEl = document.getElementById('currentDateDisplay');
    const periodeAfficheeEl = document.getElementById('periodeAffichee');
    const annualCalendarEl = document.querySelector('.annual-calendar-placeholder');

    if (!annualCalendarEl) {
        console.warn("[Conges] Élément calendrier non trouvé.");
    } else {
        console.log("[Conges] Élément calendrier trouvé.");
    }

    // Constantes et variables
    const LEAVE_TYPES_CONFIG_KEY = 'leaveTypesConfig';
    const ALL_LEAVE_REQUESTS_KEY = 'allLeaveRequests';
    
    const defaultLeaveTypes = {
        CP: {
            label: "Congés Principaux (CP)",
            color: "#3498db",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 25
        },
        RTT: {
            label: "RTT (RTT)",
            color: "#9b59b6",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 12
        },
        CS: {
            label: "Congés Supplémentaires (CS)",
            color: "#2ecc71",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 5
        },
        CEA: {
            label: "Enfant à Charge (CEA)",
            color: "#f39c12",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 3
        },
        CA: {
            label: "Ancienneté (CA)",
            color: "#e67e22",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 2
        },
        CF: {
            label: "Fractionnement (CF)",
            color: "#8e44ad",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 2
        },
        MALADIE: {
            label: "Congé Maladie",
            color: "#e74c3c",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 0
        },
        FORMATION: {
            label: "Formation",
            color: "#34495e",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 0
        },
        SANS_SOLDE: {
            label: "Congé sans solde",
            color: "#95a5a6",
            isPredefined: true,
            deletable: false,
            annualEntitlement: 0
        }
    };
    
    let leaveTypesConfig = {};
    let allLeaveRequests = [];
    let currentYear = new Date().getFullYear();

    // Fonctions helper
    async function saveLeaveTypesConfig() { 
        try { 
            await localforage.setItem(LEAVE_TYPES_CONFIG_KEY, leaveTypesConfig); 
            console.log("[Conges] Configuration sauvegardée.");
        } catch (err) { 
            console.error("[Conges] Erreur sauvegarde:", err); 
            AppUtils.showToast("Erreur sauvegarde config types.", "error"); 
        }
    }

    async function loadLeaveTypesConfig() { 
        try { 
            let storedConfig = await localforage.getItem(LEAVE_TYPES_CONFIG_KEY);
            console.log("[Conges] Chargement config:", storedConfig ? "OK" : "Vide");
            leaveTypesConfig = { ...JSON.parse(JSON.stringify(defaultLeaveTypes)) }; 
            if (storedConfig && typeof storedConfig === 'object' && Object.keys(storedConfig).length > 0) {
                for (const code in storedConfig) {
                    leaveTypesConfig[code] = {
                        ...(leaveTypesConfig[code] || {}), 
                        ...storedConfig[code],      
                        isPredefined: !!(defaultLeaveTypes[code]?.isPredefined), 
                        deletable: defaultLeaveTypes[code] ? !!defaultLeaveTypes[code].deletable : true 
                    };
                }
            }
        } catch (err) { 
            console.error("[Conges] Erreur chargement config:", err); 
            leaveTypesConfig = JSON.parse(JSON.stringify(defaultLeaveTypes)); 
        }
        await saveLeaveTypesConfig(); 
    }

    async function loadAllLeaveRequests() {
        try {
            const storedRequests = await localforage.getItem(ALL_LEAVE_REQUESTS_KEY);
            allLeaveRequests = storedRequests || [];
            console.log("[Conges] Demandes chargées:", allLeaveRequests.length);
        } catch (err) {
            console.error("[Conges] Erreur chargement demandes:", err);
            allLeaveRequests = [];
        }
    }

    async function saveAllLeaveRequests() {
        try {
            await localforage.setItem(ALL_LEAVE_REQUESTS_KEY, allLeaveRequests);
            console.log("[Conges] Demandes sauvegardées:", allLeaveRequests.length);
        } catch (err) {
            console.error("[Conges] Erreur sauvegarde demandes:", err);
        }
    }

    function updatePeriodeAffichee() {
        if (periodeAfficheeEl) {
            periodeAfficheeEl.textContent = `Année ${currentYear}`;
        }
    }

    function updateCurrentDate() {
        if (currentDateEl) {
            const today = new Date();
            currentDateEl.textContent = AppUtils.dateToYYYYMMDD(today) || today.toLocaleDateString('fr-FR');
        }
    }

    function populateLeaveTypeSelect() {
        const leaveTypeSelect = document.getElementById('saisieTypeAbsence');
        if (!leaveTypeSelect) {
            console.log("[Conges] Select non trouvé.");
            return;
        }

        leaveTypeSelect.innerHTML = '<option value="">-- Choisir un type --</option>';

        Object.entries(leaveTypesConfig).forEach(([code, config]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = config.label;
            leaveTypeSelect.appendChild(option);
        });

        console.log("[Conges] Select peuplé avec", Object.keys(leaveTypesConfig).length, "options");
    }

    function displayLeaveRequestsList() {
        let listContainer = document.getElementById('leaveRequestsList');
        if (!listContainer) {
            const saisieSection = document.getElementById('saisieAbsencesSection');
            if (saisieSection) {
                listContainer = document.createElement('div');
                listContainer.id = 'leaveRequestsList';
                listContainer.style.marginTop = '15px';
                
                const title = document.createElement('h3');
                title.textContent = 'Demandes en cours';
                title.style.marginBottom = '10px';
                
                saisieSection.appendChild(title);
                saisieSection.appendChild(listContainer);
            } else {
                console.log("[Conges] Impossible de créer le container de liste.");
                return;
            }
        }

        if (allLeaveRequests.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; font-style: italic;">Aucune demande enregistrée.</p>';
            return;
        }

        let html = '<div class="leave-requests-table">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">';
        html += '<thead><tr style="background-color: #f8f9fa;">';
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Type</th>';
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Début</th>';
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Fin</th>';
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Jours ouvrés</th>'; // Préciser "jours ouvrés"
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Actions</th>';
        html += '</tr></thead><tbody>';

        const sortedRequests = [...allLeaveRequests].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        sortedRequests.forEach(request => {
            const leaveType = leaveTypesConfig[request.type];
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            const workingDays = calculateWorkingDays(startDate, endDate); // Utiliser les jours ouvrés

            html += '<tr>';
            html += `<td style="padding: 6px 8px; border: 1px solid #ddd;"><span style="background-color: ${leaveType?.color || '#ccc'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">${leaveType?.label || request.type}</span></td>`;
            html += `<td style="padding: 6px 8px; border: 1px solid #ddd;">${startDate.toLocaleDateString('fr-FR')}</td>`;
            html += `<td style="padding: 6px 8px; border: 1px solid #ddd;">${endDate.toLocaleDateString('fr-FR')}</td>`;
            html += `<td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${workingDays}j</td>`; // Ajouter "j" pour "jours ouvrés"
            html += `<td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">`;
            html += `<button onclick="window.deleteLeaveRequest('${request.id}')" class="btn btn-xs btn-danger" style="padding: 2px 6px; font-size: 0.75em;">Supprimer</button>`;
            html += `</td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        listContainer.innerHTML = html;

        console.log("[Conges] Liste affichée:", allLeaveRequests.length, "éléments");
    }

    function generateAnnualCalendar() {
        if (!annualCalendarEl) {
            console.log("[Conges] Calendrier non disponible.");
            return;
        }

        console.log(`[Conges] Génération calendrier ${currentYear}`);
        annualCalendarEl.innerHTML = '';
        const holidays = AppUtils.getFrenchHolidays(currentYear);
        const holidayDates = new Set(holidays.map(h => h.date));

        for (let month = 0; month < 12; month++) {
            const monthContainer = document.createElement('div');
            monthContainer.className = 'mini-month-placeholder';

            const monthName = new Date(currentYear, month, 1).toLocaleDateString('fr-FR', { month: 'long' });
            const monthTitle = document.createElement('h4');
            monthTitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            monthContainer.appendChild(monthTitle);

            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(day => {
                const th = document.createElement('th');
                th.textContent = day;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const firstDay = new Date(currentYear, month, 1);
            const lastDay = new Date(currentYear, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));

            let currentDate = new Date(startDate);
            while (currentDate <= lastDay || currentDate.getDay() !== 1) {
                const row = document.createElement('tr');
                for (let i = 0; i < 7; i++) {
                    const cell = document.createElement('td');
                    const dayCell = document.createElement('div');
                    dayCell.className = 'mini-day-cell';
                    dayCell.textContent = currentDate.getDate();

                    const dateStr = AppUtils.dateToYYYYMMDD(currentDate);
                    const isCurrentMonth = currentDate.getMonth() === month;
                    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                    const isHoliday = holidayDates.has(dateStr);

                    if (!isCurrentMonth) {
                        dayCell.classList.add('other-month');
                    }
                    if (isWeekend) {
                        dayCell.classList.add('weekend');
                    }
                    if (isHoliday) {
                        dayCell.classList.add('holiday');
                    }

                    // Chercher les congés pour cette date
                    const leaveForDate = allLeaveRequests.find(req => 
                        dateStr >= req.startDate && dateStr <= req.endDate
                    );
                    
                    // IMPORTANT : Ne colorier que si c'est un jour ouvré (pas week-end ni férié)
                    if (leaveForDate && leaveTypesConfig[leaveForDate.type] && !isWeekend && !isHoliday) {
                        const leaveType = leaveTypesConfig[leaveForDate.type];
                        dayCell.style.backgroundColor = leaveType.color;
                        dayCell.style.color = '#fff';
                        dayCell.title = `${leaveType.label} - ${leaveForDate.startDate} au ${leaveForDate.endDate}`;
                    } else if (leaveForDate && (isWeekend || isHoliday)) {
                        // Si congé mais week-end/férié, juste ajouter une info dans le titre sans colorier
                        const leaveType = leaveTypesConfig[leaveForDate.type];
                        if (leaveType) {
                            const existingTitle = dayCell.title || '';
                            dayCell.title = existingTitle + (existingTitle ? ' | ' : '') + `${leaveType.label} (non comptabilisé)`;
                        }
                    }

                    cell.appendChild(dayCell);
                    row.appendChild(cell);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                tbody.appendChild(row);
                if (currentDate > lastDay && currentDate.getDay() === 1) break;
            }
            table.appendChild(tbody);
            monthContainer.appendChild(table);
            annualCalendarEl.appendChild(monthContainer);
        }
    }

    function updateLegend() {
        const legendContainer = document.getElementById('congesLegendContainer');
        if (!legendContainer) {
            console.log("[Conges] Container de légende non trouvé.");
            return;
        }

        legendContainer.innerHTML = '';

        // Éléments de base (weekend, férié)
        const weekendItem = document.createElement('div');
        weekendItem.className = 'legend-item';
        weekendItem.innerHTML = '<span class="legend-color-box color-weekend"></span>Week-end';
        legendContainer.appendChild(weekendItem);

        const holidayItem = document.createElement('div');
        holidayItem.className = 'legend-item';
        holidayItem.innerHTML = '<span class="legend-color-box color-holiday"></span>Jour férié';
        legendContainer.appendChild(holidayItem);

        // Types de congés
        Object.entries(leaveTypesConfig).forEach(([code, config]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<span class="legend-color-box" style="background-color: ${config.color}"></span>${config.label}`;
            legendContainer.appendChild(item);
        });
        
        console.log("[Conges] Légende mise à jour avec", Object.keys(leaveTypesConfig).length, "types");
    }

    function updateSoldesTable() {
        const tableBody = document.querySelector('#soldesPeriodeTable tbody');
        if (!tableBody) {
            console.log("[Conges] Table des soldes non trouvée.");
            return;
        }

        tableBody.innerHTML = '';

        Object.entries(leaveTypesConfig).forEach(([code, config]) => {
            if (config.annualEntitlement > 0) {
                const usedDays = calculateUsedDays(code);
                const remaining = config.annualEntitlement - usedDays;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${config.label}</td>
                    <td style="text-align: center;">${config.annualEntitlement}</td>
                    <td style="text-align: center;">${usedDays}</td>
                    <td style="text-align: center; color: ${remaining >= 0 ? '#2ecc71' : '#e74c3c'}">${remaining}</td>
                `;
                tableBody.appendChild(row);
            }
        });

        console.log("[Conges] Table des soldes mise à jour");
    }

    function calculateUsedDays(leaveType) {
        return allLeaveRequests
            .filter(req => req.type === leaveType)
            .reduce((total, req) => {
                const start = new Date(req.startDate);
                const end = new Date(req.endDate);
                
                // Calculer les jours ouvrés (excluant week-ends et jours fériés)
                const workingDays = calculateWorkingDays(start, end);
                return total + workingDays;
            }, 0);
    }

    function calculateWorkingDays(startDate, endDate) {
        let count = 0;
        const currentDate = new Date(startDate);
        
        // Récupérer les jours fériés pour l'année (ou les années concernées)
        const startYear = currentDate.getFullYear();
        const endYear = endDate.getFullYear();
        let holidays = new Set();
        
        // Gérer le cas où la période s'étend sur plusieurs années
        for (let year = startYear; year <= endYear; year++) {
            const yearHolidays = AppUtils.getFrenchHolidays(year);
            yearHolidays.forEach(holiday => holidays.add(holiday.date));
        }
        
        // Compter les jours ouvrés
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 6 = samedi
            const dateStr = AppUtils.dateToYYYYMMDD(currentDate);
            
            // Exclure week-ends (samedi=6, dimanche=0) et jours fériés
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
                count++;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return count;
    }

    function updateLeaveTypesConfigTable() {
        const tableBody = document.querySelector('#leaveTypesConfigTable tbody');
        if (!tableBody) {
            console.log("[Conges] Table de configuration non trouvée.");
            return;
        }

        tableBody.innerHTML = '';

        Object.entries(leaveTypesConfig).forEach(([code, config]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${code}</td>
                <td>${config.label}</td>
                <td style="text-align: center;"><span class="legend-color-box" style="background-color: ${config.color}"></span></td>
                <td style="text-align: center;">${config.annualEntitlement}</td>
                <td style="text-align: right;">
                    ${config.deletable ? `<button onclick="window.editLeaveType('${code}')" class="btn btn-xs btn-secondary">Modifier</button>
                    <button onclick="window.deleteLeaveType('${code}')" class="btn btn-xs btn-danger">Supprimer</button>` : 
                    '<span style="font-size: 0.8em; color: #666;">Prédéfini</span>'}
                </td>
            `;
            tableBody.appendChild(row);
        });

        console.log("[Conges] Table de configuration mise à jour");
    }

    async function exportData() {
        try {
            const data = {
                leaveTypesConfig,
                allLeaveRequests,
                exportDate: new Date().toISOString(),
                version: 'Rev.15'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conges_export_${AppUtils.dateToYYYYMMDD(new Date())}.json`;
            a.click();
            URL.revokeObjectURL(url);

            AppUtils.showToast("Export réussi !", "success");
        } catch (err) {
            console.error("[Conges] Erreur export:", err);
            AppUtils.showToast("Erreur lors de l'export.", "error");
        }
    }

    async function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.leaveTypesConfig) {
                leaveTypesConfig = { ...defaultLeaveTypes, ...data.leaveTypesConfig };
                await saveLeaveTypesConfig();
            }

            if (data.allLeaveRequests && Array.isArray(data.allLeaveRequests)) {
                allLeaveRequests = data.allLeaveRequests;
                await saveAllLeaveRequests();
            }

            populateLeaveTypeSelect();
            generateAnnualCalendar();
            updateLegend();
            updateSoldesTable();
            displayLeaveRequestsList();
            AppUtils.showToast("Import réussi !", "success");
        } catch (err) {
            console.error("[Conges] Erreur import:", err);
            AppUtils.showToast("Erreur lors de l'import.", "error");
        }

        event.target.value = '';
    }

    function setupEventListeners() {
        // Contrôle de l'année
        const anneeDebutEl = document.getElementById('controleAnneeDebut');
        if (anneeDebutEl) {
            anneeDebutEl.value = currentYear;
            anneeDebutEl.addEventListener('change', (e) => {
                currentYear = parseInt(e.target.value) || new Date().getFullYear();
                updatePeriodeAffichee();
                generateAnnualCalendar();
            });
        }

        // Bouton ajouter absence
        const addLeaveBtn = document.getElementById('ajouterAbsenceBtn');
        if (addLeaveBtn) {
            addLeaveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const startDateInput = document.getElementById('saisieDateDebut');
                const endDateInput = document.getElementById('saisieDateFin');
                const leaveTypeSelect = document.getElementById('saisieTypeAbsence');
                const commentInput = document.getElementById('observationsTextarea');

                if (!startDateInput || !endDateInput || !leaveTypeSelect) {
                    AppUtils.showToast("Éléments de formulaire manquants.", "error");
                    return;
                }

                const startDate = startDateInput.value;
                const endDate = endDateInput.value || startDate;
                const type = leaveTypeSelect.value;
                const comment = commentInput ? commentInput.value : '';

                if (!startDate || !type) {
                    AppUtils.showToast("Veuillez remplir au minimum la date de début et le type.", "warning");
                    return;
                }

                if (startDate > endDate) {
                    AppUtils.showToast("La date de fin doit être postérieure à la date de début.", "error");
                    return;
                }

                const newRequest = {
                    id: Date.now().toString(),
                    startDate,
                    endDate,
                    type,
                    comment,
                    createdAt: new Date().toISOString()
                };

                allLeaveRequests.push(newRequest);
                await saveAllLeaveRequests();
                generateAnnualCalendar();
                updateSoldesTable();
                displayLeaveRequestsList();
                
                // Reset du formulaire
                startDateInput.value = '';
                endDateInput.value = '';
                leaveTypeSelect.value = '';
                if (commentInput) commentInput.value = '';
                
                AppUtils.showToast("Demande de congés ajoutée avec succès.", "success");
            });
        }

        // Bouton retirer absence
        const removeLeaveBtn = document.getElementById('retirerAbsenceBtn');
        if (removeLeaveBtn) {
            removeLeaveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const startDateInput = document.getElementById('saisieDateDebut');
                const leaveTypeSelect = document.getElementById('saisieTypeAbsence');

                if (!startDateInput || !leaveTypeSelect) {
                    AppUtils.showToast("Éléments de formulaire manquants.", "error");
                    return;
                }

                const startDate = startDateInput.value;
                const type = leaveTypeSelect.value;

                if (!startDate || !type) {
                    AppUtils.showToast("Veuillez sélectionner une date et un type pour retirer.", "warning");
                    return;
                }

                const toRemove = allLeaveRequests.filter(req => 
                    req.startDate <= startDate && req.endDate >= startDate && req.type === type
                );

                if (toRemove.length === 0) {
                    AppUtils.showToast("Aucune demande trouvée pour cette date et ce type.", "warning");
                    return;
                }

                if (!confirm(`Supprimer ${toRemove.length} demande(s) de ${leaveTypesConfig[type]?.label || type} ?`)) {
                    return;
                }

                toRemove.forEach(req => {
                    const index = allLeaveRequests.findIndex(r => r.id === req.id);
                    if (index !== -1) {
                        allLeaveRequests.splice(index, 1);
                    }
                });

                await saveAllLeaveRequests();
                generateAnnualCalendar();
                updateSoldesTable();
                displayLeaveRequestsList();
                AppUtils.showToast(`${toRemove.length} demande(s) supprimée(s).`, "success");
            });
        }

        // Boutons d'export/import
        const exportBtn = document.getElementById('exportCongesBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportData);
        }

        const importBtn = document.querySelector('label[for="importCongesFile"]');
        const importInput = document.getElementById('importCongesFile');
        if (importBtn && importInput) {
            importInput.addEventListener('change', importData);
        }

        // Autres boutons
        const actualiserBtn = document.getElementById('actualiserPeriodeBtn');
        if (actualiserBtn) {
            actualiserBtn.addEventListener('click', () => {
                generateAnnualCalendar();
                AppUtils.showToast("Calendrier actualisé.", "success");
            });
        }

        const imprimerBtn = document.getElementById('imprimerVueBtn');
        if (imprimerBtn) {
            imprimerBtn.addEventListener('click', () => {
                window.print();
            });
        }

        const afficherNoticeBtn = document.getElementById('afficherNoticeBtn');
        const contenuNotice = document.getElementById('contenuNotice');
        if (afficherNoticeBtn && contenuNotice) {
            afficherNoticeBtn.addEventListener('click', () => {
                if (contenuNotice.style.display === 'none') {
                    contenuNotice.style.display = 'block';
                    afficherNoticeBtn.textContent = 'Masquer Notice';
                } else {
                    contenuNotice.style.display = 'none';
                    afficherNoticeBtn.textContent = 'Afficher Notice';
                }
            });
        }

        const afficherParamBtn = document.getElementById('afficherParamBtn');
        const leaveTypesConfigWrapper = document.getElementById('leaveTypesConfigContentWrapper');
        if (afficherParamBtn && leaveTypesConfigWrapper) {
            afficherParamBtn.addEventListener('click', () => {
                if (leaveTypesConfigWrapper.style.display === 'none') {
                    leaveTypesConfigWrapper.style.display = 'block';
                    afficherParamBtn.textContent = 'Masquer Param.';
                    updateLeaveTypesConfigTable();
                } else {
                    leaveTypesConfigWrapper.style.display = 'none';
                    afficherParamBtn.textContent = 'Afficher Param.';
                }
            });
        }

        // Gestion du formulaire de configuration des types
        const leaveTypeConfigForm = document.getElementById('leaveTypeConfigForm');
        if (leaveTypeConfigForm) {
            leaveTypeConfigForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const code = document.getElementById('ltConfigCode').value.trim().toUpperCase();
                const label = document.getElementById('ltConfigLabel').value.trim();
                const color = document.getElementById('ltConfigColor').value;
                const entitlement = parseFloat(document.getElementById('ltConfigInitial').value) || 0;
                const isEditing = document.getElementById('ltConfigIsEditing').value;

                if (!code || !label) {
                    AppUtils.showToast("Code et libellé sont obligatoires.", "warning");
                    return;
                }

                leaveTypesConfig[code] = {
                    label,
                    color,
                    annualEntitlement: entitlement,
                    isPredefined: false,
                    deletable: true
                };

                await saveLeaveTypesConfig();
                updateLeaveTypesConfigTable();
                populateLeaveTypeSelect();
                updateLegend();
                
                leaveTypeConfigForm.reset();
                document.getElementById('ltConfigIsEditing').value = '';
                document.getElementById('addUpdateLtConfigBtn').textContent = 'Sauvegarder Type';
                
                AppUtils.showToast(isEditing ? "Type mis à jour." : "Type ajouté.", "success");
            });
        }

        const clearFormBtn = document.getElementById('clearLtConfigFormBtn');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => {
                document.getElementById('leaveTypeConfigForm').reset();
                document.getElementById('ltConfigIsEditing').value = '';
                document.getElementById('addUpdateLtConfigBtn').textContent = 'Sauvegarder Type';
            });
        }

        console.log("[Conges] Event listeners configurés");
    }

    // Créer un objet module global pour les fonctions callback
    window.congesModule = {
        deleteRequest: async function(requestId) {
            const index = allLeaveRequests.findIndex(req => req.id === requestId);
            if (index !== -1) {
                allLeaveRequests.splice(index, 1);
                await saveAllLeaveRequests();
                generateAnnualCalendar();
                updateSoldesTable();
                displayLeaveRequestsList();
                AppUtils.showToast("Demande supprimée avec succès.", "success");
            }
        },

        editType: function(code) {
            const config = leaveTypesConfig[code];
            if (!config) return;

            document.getElementById('ltConfigCode').value = code;
            document.getElementById('ltConfigLabel').value = config.label;
            document.getElementById('ltConfigColor').value = config.color;
            document.getElementById('ltConfigInitial').value = config.annualEntitlement;
            document.getElementById('ltConfigIsEditing').value = code;
            
            document.getElementById('addUpdateLtConfigBtn').textContent = 'Mettre à jour';
        },

        deleteType: async function(code) {
            if (!confirm(`Supprimer le type "${leaveTypesConfig[code]?.label}" ?`)) return;
            
            delete leaveTypesConfig[code];
            await saveLeaveTypesConfig();
            updateLeaveTypesConfigTable();
            populateLeaveTypeSelect();
            updateLegend();
            AppUtils.showToast("Type supprimé.", "success");
        }
    };

    // --- SÉQUENCE D'INITIALISATION EFFECTIVE ---
    console.log("[Conges Initialize] Début de l'initialisation effective.");
    try {
        await loadLeaveTypesConfig(); 
        await loadAllLeaveRequests();
        
        updateCurrentDate();
        updatePeriodeAffichee();
        populateLeaveTypeSelect();
        generateAnnualCalendar();
        updateLegend();
        updateSoldesTable();
        displayLeaveRequestsList();
        setupEventListeners(); 
        
        console.log("[Conges] Module Congés initialisé (Rev.15) avec", Object.keys(leaveTypesConfig).length, "types de congés et", allLeaveRequests.length, "demandes.");
        congesInitialized = true;
    } catch (error) {
        console.error("[Conges] Erreur pendant l'initialisation:", error);
        AppUtils.showToast("Erreur majeure lors de l'initialisation des congés: " + error.message, "error", 10000);
        congesInitialized = false; 
    }
}

// Fonctions globales pour les callbacks
window.deleteLeaveRequest = function(requestId) {
    if (window.congesModule && window.congesModule.deleteRequest) {
        window.congesModule.deleteRequest(requestId);
    }
};

window.editLeaveType = function(code) {
    if (window.congesModule && window.congesModule.editType) {
        window.congesModule.editType(code);
    }
};

window.deleteLeaveType = function(code) {
    if (window.congesModule && window.congesModule.deleteType) {
        window.congesModule.deleteType(code);
    }
};

// --- POINT D'ENTRÉE DU SCRIPT CONGES.JS ---
function initializeCongesModuleOnce() {
    if (congesInitialized && !document.body.classList.contains('reloading-for-debug')) return;
    document.removeEventListener('appUtilsReady', initializeCongesModuleOnce);
    console.log('[Conges] Événement appUtilsReady reçu. Appel de initializeCongesModuleActual.');
    initializeCongesModuleActual();
}

function attemptInitializeCongesModule() {
    if (window.appUtilsReadyState === 'ready') {
        console.log('[Conges] AppUtils est déjà prêt. Appel de initializeCongesModuleActual.');
        initializeCongesModuleActual();
    } else {
        console.log('[Conges] AppUtils pas encore prêt. Attente de l\'événement appUtilsReady.');
        document.addEventListener('appUtilsReady', initializeCongesModuleOnce);
    }
}

if (document.readyState === 'loading') {
    console.log('[Conges] DOM non prêt. Ajout écouteur DOMContentLoaded pour attemptInitializeCongesModule.');
    document.addEventListener('DOMContentLoaded', attemptInitializeCongesModule);
} else {
    console.log('[Conges] DOM déjà prêt. Appel de attemptInitializeCongesModule.');
    attemptInitializeCongesModule();
}