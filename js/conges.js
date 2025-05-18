// app/js/conges.js
document.addEventListener('DOMContentLoaded', () => {
    const congesPageIdentifier = document.querySelector('.conges-layout-grid'); // General identifier for conges page
    if (!congesPageIdentifier) {
        return;
    }
    console.log('Module Congés (V_ImageMatch) chargé.');

    const utilsNeeded = ['showToast', 'getISODate', 'getFrenchHolidays', 'calculateEaster', 'hexToRgba', 'dateToYYYYMMDD', 'parseYYYYMMDD'];
    let allUtilsAvailable = true;
    for(const funcName of utilsNeeded) {
        if (typeof window[funcName] !== 'function') {
            console.error(`Fonction utilitaire MANQUANTE dans Congés: ${funcName}`);
            allUtilsAvailable = false;
        }
    }
    if (!allUtilsAvailable || typeof localforage === 'undefined') {
         const errorMsg = "Erreur critique Congés: Dépendances manquantes ou stockage local.";
         if(typeof showToast === 'function') showToast(errorMsg, 'error', 10000); else alert(errorMsg);
        return;
    }

    // --- Références DOM ---
    const controleAnneeDebutInput = document.getElementById('controleAnneeDebut');
    const periodeAfficheeSpan = document.getElementById('periodeAffichee');
    const actualiserPeriodeBtn = document.getElementById('actualiserPeriodeBtn');
    const exportCongesBtn = document.getElementById('exportCongesBtn');
    const importCongesFileInput = document.getElementById('importCongesFile');
    const imprimerVueBtn = document.getElementById('imprimerVueBtn');
    const congesLegendContainer = document.getElementById('congesLegendContainer');
    // const afficherNoticeBtn = document.getElementById('afficherNoticeBtn'); // Action not implemented yet

    const customAnnualCalendarContainer = document.getElementById('customAnnualCalendarContainer');
    const calendarViewTitle = document.querySelector('.calendar-view-title'); // For potential dynamic update if needed

    const saisieAbsencesForm = document.getElementById('saisieAbsencesForm');
    const saisieTypeAbsenceSelect = document.getElementById('saisieTypeAbsence');
    const saisieDateDebutInput = document.getElementById('saisieDateDebut');
    const saisieDateFinInput = document.getElementById('saisieDateFin');
    const ajouterAbsenceBtn = document.getElementById('ajouterAbsenceBtn');
    const retirerAbsenceBtn = document.getElementById('retirerAbsenceBtn');

    const afficherParamBtn = document.getElementById('afficherParamBtn');
    const soldesPeriodeTableBody = document.getElementById('soldesPeriodeTable')?.querySelector('tbody');
    const leaveTypesConfigContentWrapper = document.getElementById('leaveTypesConfigContentWrapper');
    
    const leaveTypesConfigTable = document.getElementById('leaveTypesConfigTable');
    const leaveTypesConfigTableBody = leaveTypesConfigTable ? leaveTypesConfigTable.querySelector('tbody') : null;
    const leaveTypeConfigForm = document.getElementById('leaveTypeConfigForm');
    const ltConfigIsEditingInput = document.getElementById('ltConfigIsEditing');
    const ltConfigCodeInput = document.getElementById('ltConfigCode');
    const ltConfigLabelInput = document.getElementById('ltConfigLabel');
    const ltConfigColorInput = document.getElementById('ltConfigColor');
    const ltConfigInitialInput = document.getElementById('ltConfigInitial');

    const criticalDOMElements = { controleAnneeDebutInput, periodeAfficheeSpan, actualiserPeriodeBtn, exportCongesBtn, importCongesFileInput, imprimerVueBtn, congesLegendContainer, customAnnualCalendarContainer, saisieAbsencesForm, saisieTypeAbsenceSelect, saisieDateDebutInput, saisieDateFinInput, ajouterAbsenceBtn, retirerAbsenceBtn, afficherParamBtn, soldesPeriodeTableBody, leaveTypesConfigContentWrapper, leaveTypesConfigTableBody, leaveTypeConfigForm };
    let missingCriticalElements = [];
    for (const key in criticalDOMElements) { if (!criticalDOMElements[key]) missingCriticalElements.push(key); }
    if (missingCriticalElements.length > 0) { const errorMsg = `Congés Erreur DOM: Éléments cruciaux manquants: ${missingCriticalElements.join(', ')}.`; console.error(errorMsg); if(typeof showToast === 'function') showToast(errorMsg, 'error', 15000); else alert(errorMsg); return; }
    
    // --- Constantes et Variables Globales ---
    const LEAVE_TYPES_CONFIG_KEY = 'leaveTypesConfig_v2.3_imgMatch'; 
    const LEAVE_REQUESTS_KEY = 'leaveRequests_v2.2_imgMatch';     
    const PENDING_REQUEST_OPACITY = 0.55;
    
    let defaultLeaveTypes = { 
        "CP":  { label: "Congés Principaux", color: "#90caf9", initialRightsPerYear: 25, isPredefined: true, deletable: false }, 
        "RTT": { label: "RTT", color: "#a5d6a7", initialRightsPerYear: 10, isPredefined: true, deletable: false }, 
        "CS":  { label: "Congés Supplémentaires", color: "#ce93d8", initialRightsPerYear: 0, isPredefined: true, deletable: false },
        "CEA": { label: "Enfant à Charge", color: "#ef9a9a", initialRightsPerYear: 0, isPredefined: true, deletable: false },
        "CA":  { label: "Ancienneté", color: "#ffcc80", initialRightsPerYear: 0, isPredefined: true, deletable: false },
        "CF":  { label: "Fractionnement", color: "#80deea", initialRightsPerYear: 0, isPredefined: true, deletable: false }
    };
    let leaveTypesConfig = {}; 
    let allLeaveRequests = []; 
    let currentPeriodStartYear = 2025;

    async function _saveLeaveTypesConfig() { 
        try { await localforage.setItem(LEAVE_TYPES_CONFIG_KEY, leaveTypesConfig); } 
        catch (err) { console.error("Erreur sauvegarde LTC:", err); if(typeof showToast === 'function') showToast("Erreur sauvegarde config types.", "error"); }
    }

    async function _loadLeaveTypesConfig() { 
        try { 
            let storedConfig = await localforage.getItem(LEAVE_TYPES_CONFIG_KEY);
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
            console.error("Erreur chargement LTC:", err); 
            leaveTypesConfig = JSON.parse(JSON.stringify(defaultLeaveTypes)); 
        }
        await _saveLeaveTypesConfig();
    }

    async function _loadAllLeaveRequests() { 
        try { const sr = await localforage.getItem(LEAVE_REQUESTS_KEY); allLeaveRequests = Array.isArray(sr) ? sr : []; } 
        catch (err) { console.error("Err loadLR:", err); allLeaveRequests = []; }
    }

    async function _saveAllLeaveRequests() { 
        try { 
            allLeaveRequests.sort((a,b) => parseYYYYMMDD(b.startDate) - parseYYYYMMDD(a.startDate)); 
            await localforage.setItem(LEAVE_REQUESTS_KEY, allLeaveRequests); 
        } catch (err) { console.error("Err saveLR:", err); }
    }
    
    function _populateLeaveTypeConfigForm(code = '', config = { label: '', color: '#cccccc', initialRightsPerYear: 0 }) { 
        if(!ltConfigIsEditingInput || !ltConfigCodeInput || !ltConfigLabelInput || !ltConfigColorInput || !ltConfigInitialInput) return; 
        ltConfigIsEditingInput.value = code; 
        ltConfigCodeInput.value = code; 
        ltConfigLabelInput.value = config.label || ''; 
        ltConfigColorInput.value = config.color || '#cccccc'; 
        ltConfigInitialInput.value = config.initialRightsPerYear || 0; 
        const isPredefinedNonEditable = !!(code && defaultLeaveTypes[code] && !defaultLeaveTypes[code].deletable);
        ltConfigCodeInput.readOnly = isPredefinedNonEditable; 
        ltConfigCodeInput.style.backgroundColor = isPredefinedNonEditable ? '#e9ecef' : '#fff';
        if(!isPredefinedNonEditable && ltConfigCodeInput) ltConfigCodeInput.focus(); else if(ltConfigLabelInput) ltConfigLabelInput.focus();
    }

    function _resetLeaveTypeConfigForm() { 
        _populateLeaveTypeConfigForm(); 
        if(ltConfigCodeInput) { ltConfigCodeInput.readOnly = false; ltConfigCodeInput.style.backgroundColor = '#fff';}
    }

    function _renderLeaveTypesConfigTable() { 
        if (!leaveTypesConfigTableBody) { console.error("_renderLeaveTypesConfigTable: tbody manquant."); return; }
        leaveTypesConfigTableBody.innerHTML = '';
        const sortedTypes = Object.entries(leaveTypesConfig).sort(([,a],[,b]) => (a.label || "").localeCompare(b.label || ""));
        if (sortedTypes.length === 0) { leaveTypesConfigTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucun type de congé configuré.</td></tr>`; return; }
        for (const [code, config] of sortedTypes) { 
            const row = leaveTypesConfigTableBody.insertRow(); 
            row.insertCell().textContent = code; 
            row.insertCell().textContent = config.label || 'N/A'; 
            const colorCell = row.insertCell(); const colorPreview = document.createElement('span'); colorPreview.classList.add('legend-color-box'); colorPreview.style.backgroundColor = config.color || '#ccc'; colorPreview.style.display = 'inline-block'; colorPreview.style.marginRight = '5px'; colorCell.appendChild(colorPreview); colorCell.appendChild(document.createTextNode(config.color || 'N/A')); 
            row.insertCell().textContent = config.initialRightsPerYear || 0; 
            const actionsCell = row.insertCell(); const editBtn = document.createElement('button'); editBtn.textContent = 'Modifier'; editBtn.classList.add('btn', 'btn-sm', 'btn-light'); editBtn.onclick = () => _populateLeaveTypeConfigForm(code, config); actionsCell.appendChild(editBtn); 
            if (!config.isPredefined || config.deletable) { const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Suppr.'; deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger'); deleteBtn.style.marginLeft = '5px'; deleteBtn.onclick = () => _handleDeleteLeaveType(code); actionsCell.appendChild(deleteBtn); }
        }
    }

    function _populateSaisieTypeAbsenceSelect() { 
        if(!saisieTypeAbsenceSelect) {console.error("_populateSaisieTypeAbsenceSelect: select manquant"); return;}
        saisieTypeAbsenceSelect.innerHTML = '<option value="">Sélectionner...</option>'; 
        const sortedTypes = Object.entries(leaveTypesConfig).sort(([,a],[,b]) => (a.label || "").localeCompare(b.label || "")); 
        for (const [code, config] of sortedTypes) { 
            const option = document.createElement('option'); 
            option.value = code; 
            option.textContent = `${config.label} (${code})`; 
            saisieTypeAbsenceSelect.appendChild(option); 
        }
        if (leaveTypesConfig["CP"]) {
            saisieTypeAbsenceSelect.value = "CP";
        }
    }
    
    function _renderLegend() { 
        if(!congesLegendContainer) {console.warn("_renderLegend: Conteneur de légende manquant"); return;} 
        congesLegendContainer.innerHTML = ''; 
        const legendOrder = ["CP", "RTT", "CS", "CEA", "CA", "CF"];
        const sortedTypesForLegend = [];
        legendOrder.forEach(code => {
            if (leaveTypesConfig[code]) {
                sortedTypesForLegend.push([code, leaveTypesConfig[code]]);
            }
        });
        Object.entries(leaveTypesConfig).forEach(([code, config]) => {
            if (!legendOrder.includes(code)) {
                sortedTypesForLegend.push([code, config]);
            }
        });

        if (sortedTypesForLegend.length === 0 && Object.keys(defaultLeaveTypes).length > 0) {
             console.warn("[Render Legend] leaveTypesConfig est vide, mais defaultLeaveTypes existe.");
        }
        for (const [code, config] of sortedTypesForLegend) { 
            const item = document.createElement('div'); item.classList.add('legend-item'); 
            const colorBox = document.createElement('span'); 
            colorBox.classList.add('legend-color-box'); 
            colorBox.style.backgroundColor = config.color || '#ccc';
            item.appendChild(colorBox); 
            item.appendChild(document.createTextNode(` ${config.label} (${code})`)); 
            congesLegendContainer.appendChild(item); 
        } 
        
        const weekEndItem = document.createElement('div'); weekEndItem.classList.add('legend-item'); 
        weekEndItem.innerHTML = `<span class="legend-color-box color-weekend"></span> Week-end`; 
        congesLegendContainer.appendChild(weekEndItem); 

        const jourFerieItem = document.createElement('div'); jourFerieItem.classList.add('legend-item'); 
        jourFerieItem.innerHTML = `<span class="legend-color-box color-holiday"></span> Jour Férié`; 
        congesLegendContainer.appendChild(jourFerieItem);
    }
    
    function _updatePeriodeAffichee() { 
        if (periodeAfficheeSpan && controleAnneeDebutInput) { 
            const year = parseInt(controleAnneeDebutInput.value, 10);
            if (!isNaN(year)) {
                currentPeriodStartYear = year;
                periodeAfficheeSpan.textContent = `${year} - ${year + 1}`;
                if (calendarViewTitle) {
                     calendarViewTitle.textContent = `Vue Annuelle ${year} - ${year + 1}`;
                }
            }
        }
    }

    function _countBusinessDays(startDateStr, endDateStr, holidaysSet) { 
        let count = 0; let currentD = parseYYYYMMDD(startDateStr); const finalD = parseYYYYMMDD(endDateStr); if (!currentD || !finalD) return 0; while(currentD <= finalD) { const dayW = currentD.getDay(); const isoStr = dateToYYYYMMDD(currentD); if (dayW !== 0 && dayW !== 6 && !holidaysSet.has(isoStr)) { count++; } currentD.setDate(currentD.getDate() + 1); } return count;
    }

    function _calculateJoursPrisPourType(typeCode, periodStartYr) { 
        let joursPris = 0; const periodStartDateObj = new Date(periodStartYr, 5, 1); const periodEndDateObj = new Date(periodStartYr + 1, 4, 31); allLeaveRequests.forEach(req => { if (req.type === typeCode && req.status === "APPROUVEE") { const reqStartDateObj = parseYYYYMMDD(req.startDate); const reqEndDateObj = parseYYYYMMDD(req.endDate); if (!reqStartDateObj || !reqEndDateObj) return; let currentDayInReq = new Date(reqStartDateObj); 
        
        const holidaysForReqPeriod = new Set(); // Holidays specific to the request's duration
        for (let y = reqStartDateObj.getFullYear(); y <= reqEndDateObj.getFullYear(); y++) {
            const holidaysRaw = getFrenchHolidays(y);
            if (Array.isArray(holidaysRaw)) {
                holidaysRaw.forEach(h => {
                    if (h && h.date) holidaysForReqPeriod.add(h.date);
                });
            } else {
                // console.warn(`_calculateJoursPrisPourType: getFrenchHolidays(${y}) did not return an array for request period check.`);
            }
        }
        
        while(currentDayInReq <= reqEndDateObj) { if (currentDayInReq >= periodStartDateObj && currentDayInReq <= periodEndDateObj) { const dayOfWeek = currentDayInReq.getDay(); if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysForReqPeriod.has(dateToYYYYMMDD(currentDayInReq))) { joursPris++; } } currentDayInReq.setDate(currentDayInReq.getDate() + 1); } } }); return joursPris;
    }

    async function _renderBalances() { 
        if(!soldesPeriodeTableBody) { console.error("_renderBalances: tbody (soldesPeriodeTableBody) manquant."); return; }
        soldesPeriodeTableBody.innerHTML = ''; 
        _updatePeriodeAffichee(); 
        
        const sortedTypesForBalance = Object.entries(leaveTypesConfig).sort(([,a],[,b]) => (a.label || "").localeCompare(b.label || ""));
        if (sortedTypesForBalance.length === 0) { soldesPeriodeTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Aucun type de congé configuré.</td></tr>`; return; }
        
        for (const [code, config] of sortedTypesForBalance) { 
            if (config.initialRightsPerYear > 0 || code === "CP" || code === "RTT") {
                const droitsAcquis = config.initialRightsPerYear || 0; 
                const joursPris = _calculateJoursPrisPourType(code, currentPeriodStartYear); 
                const soldeRestant = droitsAcquis - joursPris; 
                const row = soldesPeriodeTableBody.insertRow(); 
                row.insertCell().textContent = `${config.label} (${code})`; 
                row.insertCell().textContent = droitsAcquis; 
                row.insertCell().textContent = joursPris; 
                row.insertCell().textContent = soldeRestant; 
            }
        }
    }
    
    function _renderCustomAnnualCalendar() { 
        if(!customAnnualCalendarContainer) { console.error("[Calendar Render] ERREUR: Conteneur du calendrier (#customAnnualCalendarContainer) MANQUANT."); return; }
        customAnnualCalendarContainer.innerHTML = ''; 
        const startYear = currentPeriodStartYear; const endYear = currentPeriodStartYear + 1;

        // --- MODIFICATION START ---
        let holidaysForStartYearSet = new Set();
        const rawHolidaysStart = getFrenchHolidays(startYear);
        if (Array.isArray(rawHolidaysStart)) {
            rawHolidaysStart.forEach(h => {
                if (h && h.date) holidaysForStartYearSet.add(h.date);
            });
        } else {
            console.error(`_renderCustomAnnualCalendar: getFrenchHolidays(${startYear}) did not return an array. Calendar holiday highlighting may be incomplete.`);
        }

        let holidaysForEndYearSet = new Set();
        const rawHolidaysEnd = getFrenchHolidays(endYear);
        if (Array.isArray(rawHolidaysEnd)) {
            rawHolidaysEnd.forEach(h => {
                if (h && h.date) holidaysForEndYearSet.add(h.date);
            });
        } else {
            console.error(`_renderCustomAnnualCalendar: getFrenchHolidays(${endYear}) did not return an array. Calendar holiday highlighting may be incomplete.`);
        }
        // --- MODIFICATION END ---

        const L_luminance = (colorString) => { let rDec, gDec, bDec; if (colorString.startsWith('#')) { let cValStr = colorString.slice(1); if (cValStr.length === 3) cValStr = cValStr[0]+cValStr[0]+cValStr[1]+cValStr[1]+cValStr[2]+cValStr[2]; if (cValStr.length !== 6) return 0.5; rDec = parseInt(cValStr.substring(0,2),16); gDec = parseInt(cValStr.substring(2,4),16); bDec = parseInt(cValStr.substring(4,6),16); } else if (colorString.startsWith('rgb')) { const parts = colorString.match(/\d+/g); if (!parts || parts.length < 3) return 0.5; rDec = parseInt(parts[0],10); gDec = parseInt(parts[1],10); bDec = parseInt(parts[2],10); } else { return 0.5; } if (isNaN(rDec) || isNaN(gDec) || isNaN(bDec)) return 0.5; const rN = rDec/255, gN=gDec/255, bN=bDec/255; const rSRGB = rN <= 0.03928 ? rN/12.92 : Math.pow((rN+0.055)/1.055, 2.4); const gSRGB = gN <= 0.03928 ? gN/12.92 : Math.pow((gN+0.055)/1.055, 2.4); const bSRGB = bN <= 0.03928 ? bN/12.92 : Math.pow((bN+0.055)/1.055, 2.4); return 0.2126 * rSRGB + 0.7152 * gSRGB + 0.0722 * bSRGB; };
        
        for (let i = 0; i < 12; i++) { 
            let currentMonthIndex, currentDisplayYear; 
            if (i < 7) { currentMonthIndex = 5 + i; currentDisplayYear = startYear; }
            else { currentMonthIndex = i - 7; currentDisplayYear = endYear; } 
            
            const monthDateForName = new Date(currentDisplayYear, currentMonthIndex, 1);
            const monthName = monthDateForName.toLocaleDateString('fr-FR', { month: 'long' });
            const yearForTitle = monthDateForName.getFullYear();
            
            const monthDiv = document.createElement('div'); monthDiv.classList.add('mini-month-placeholder'); 
            const h4Title = document.createElement('h4'); h4Title.textContent = `${monthName} ${yearForTitle}`; monthDiv.appendChild(h4Title); 
            const table = document.createElement('table'); const thd = table.createTHead(); const hr = thd.insertRow(); 
            const DAY_NAMES_S = ["L", "M", "M", "J", "V", "S", "D"]; DAY_NAMES_S.forEach(dn => { const th = document.createElement('th'); th.textContent = dn; hr.appendChild(th); }); 
            const tbd = table.createTBody(); const firstD = new Date(currentDisplayYear, currentMonthIndex, 1); 
            const daysInM = new Date(currentDisplayYear, currentMonthIndex + 1, 0).getDate(); 
            let startDayW = (firstD.getDay() + 6) % 7; let dateCnt = 1;

            for (let wR = 0; wR < 6; wR++) { 
                const tr = tbd.insertRow(); 
                if (dateCnt > daysInM && wR > 0) {
                    const prevRowCells = Array.from(tbd.rows[tbd.rows.length-2].cells); 
                    if(prevRowCells.every(c => c.querySelector('.mini-day-cell')?.classList.contains('other-month'))) {tbd.deleteRow(tbd.rows.length-1); break;}
                }
                for (let dC = 0; dC < 7; dC++) { 
                    const td = tr.insertCell(); const dayCellDiv = document.createElement('div'); dayCellDiv.classList.add('mini-day-cell'); 
                    if (wR === 0 && dC < startDayW) { dayCellDiv.classList.add('other-month'); dayCellDiv.innerHTML = ' '; } 
                    else if (dateCnt > daysInM) { dayCellDiv.classList.add('other-month'); dayCellDiv.innerHTML = ' '; } 
                    else { 
                        dayCellDiv.textContent = dateCnt; 
                        const currDObj = new Date(currentDisplayYear, currentMonthIndex, dateCnt); 
                        const currD_YMD = dateToYYYYMMDD(currDObj); 
                        const dWJS = currDObj.getDay(); 
                        dayCellDiv.title = currDObj.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}); 
                        
                        const holsToChk = currDObj.getFullYear() === startYear ? holidaysForStartYearSet : holidaysForEndYearSet; 
                        if (holsToChk.has(currD_YMD)) { dayCellDiv.classList.add('holiday'); dayCellDiv.title = `Jour férié: ${dayCellDiv.title}`; }
                        if (dWJS === 0 || dWJS === 6) { dayCellDiv.classList.add('weekend'); if(!holsToChk.has(currD_YMD)) dayCellDiv.title += " (Week-end)";} 

                        allLeaveRequests.forEach(req => { 
                            if (currD_YMD >= req.startDate && currD_YMD <= req.endDate) { 
                                const typeCfg = leaveTypesConfig[req.type]; 
                                if (dWJS !==0 && dWJS !==6 && !holsToChk.has(currD_YMD)) {
                                    if (typeCfg) { 
                                        let dColor = typeCfg.color; 
                                        let dTitle = typeCfg.label || req.type; 
                                        let isPend = req.status === "DEMANDEE"; 
                                        dayCellDiv.style.borderStyle = ''; dayCellDiv.style.borderColor = ''; dayCellDiv.style.borderWidth = ''; 
                                        if (isPend) { 
                                            dColor = hexToRgba(typeCfg.color, PENDING_REQUEST_OPACITY); 
                                            dayCellDiv.style.borderStyle = 'dashed'; dayCellDiv.style.borderColor = typeCfg.color; dayCellDiv.style.borderWidth = '1.5px'; dTitle += " (Attente)"; 
                                        } 
                                        dayCellDiv.style.backgroundColor = dColor; 
                                        const baseColorTxtForLum = isPend ? typeCfg.color : typeCfg.color; 
                                        const lum = L_luminance(baseColorTxtForLum); 
                                        dayCellDiv.style.color = lum > 0.4 ? '#000' : '#fff'; 
                                        dayCellDiv.title = dTitle; 
                                    } 
                                } 
                            } 
                        }); 
                        dateCnt++;
                    } 
                    td.appendChild(dayCellDiv);
                } 
            } 
            monthDiv.appendChild(table); customAnnualCalendarContainer.appendChild(monthDiv); 
        }
    }
    
    async function _handleSaveLeaveTypeConfig(event) { 
        event.preventDefault(); if(!ltConfigCodeInput || !ltConfigLabelInput || !ltConfigColorInput || !ltConfigInitialInput || !ltConfigIsEditingInput) return; const code = ltConfigCodeInput.value.trim().toUpperCase(); const label = ltConfigLabelInput.value.trim(); const color = ltConfigColorInput.value; const initialRights = parseFloat(ltConfigInitialInput.value); const isEditingCode = ltConfigIsEditingInput.value; if (!code || !label) { showToast("Code et libellé requis.", "warning"); return; } if (code.length > 10) { showToast("Code: max 10 chars.", "warning"); return;} if (/[^A-Z0-9_]/.test(code)) { showToast("Code: A-Z, 0-9, _ uniquement.", "warning"); return;} if (isNaN(initialRights) || initialRights < 0) { showToast("Droits initiaux invalides.", "warning"); return; } if (!/^#[0-9A-F]{6}$/i.test(color) && !/^#[0-9A-F]{3}$/i.test(color)) { showToast("Format couleur invalide.", "warning"); return; } if (!isEditingCode && leaveTypesConfig[code]) { showToast(`Code "${code}" existe déjà.`, "error"); return; } if (isEditingCode && code !== isEditingCode && leaveTypesConfig[code]) { showToast(`Nouveau code "${code}" existe déjà.`, "error"); return;} let typeData = { label, color, initialRightsPerYear: initialRights, isPredefined: !!(isEditingCode && defaultLeaveTypes[isEditingCode]?.isPredefined), deletable: !(isEditingCode && defaultLeaveTypes[isEditingCode] && !defaultLeaveTypes[isEditingCode]?.deletable) }; if (!isEditingCode) { typeData.isPredefined = false; typeData.deletable = true; } if (isEditingCode && code !== isEditingCode && !defaultLeaveTypes[isEditingCode]) { delete leaveTypesConfig[isEditingCode]; allLeaveRequests.forEach(req => { if (req.type === isEditingCode) req.type = code; }); } leaveTypesConfig[code] = typeData; await _saveLeaveTypesConfig(); await _saveAllLeaveRequests(); showToast(`Type "${label}" sauvegardé.`, "success"); _resetLeaveTypeConfigForm(); _renderLeaveTypesConfigTable(); _populateSaisieTypeAbsenceSelect(); _renderLegend(); await _renderBalances(); _renderCustomAnnualCalendar();
    }
    async function _handleDeleteLeaveType(codeToDelete) { 
        if (!leaveTypesConfig[codeToDelete] || (leaveTypesConfig[codeToDelete].isPredefined && !leaveTypesConfig[codeToDelete].deletable) ) { showToast("Type non supprimable.", "error"); return; } if (confirm(`Supprimer type "${leaveTypesConfig[codeToDelete].label}" (${codeToDelete}) et ses demandes associées ?`)) { delete leaveTypesConfig[codeToDelete]; allLeaveRequests = allLeaveRequests.filter(req => req.type !== codeToDelete); await _saveLeaveTypesConfig(); await _saveAllLeaveRequests(); showToast(`Type "${codeToDelete}" et demandes associées supprimés.`, "info"); _resetLeaveTypeConfigForm(); _renderLeaveTypesConfigTable(); _populateSaisieTypeAbsenceSelect(); _renderLegend(); await _renderBalances(); _renderCustomAnnualCalendar(); }
    }
    
    function _handleActualiserPeriode() { 
        const yearVal = parseInt(controleAnneeDebutInput.value, 10); 
        if (!isNaN(yearVal) && yearVal >= 2000 && yearVal <= 2050) { 
            currentPeriodStartYear = yearVal; 
            _updatePeriodeAffichee(); 
            _renderCustomAnnualCalendar(); 
            _renderBalances(); 
            showToast(`Calendrier mis à jour pour la période ${currentPeriodStartYear} - ${currentPeriodStartYear + 1}.`, 'info'); 
        } else { 
            showToast("Année invalide. Veuillez entrer une année entre 2000 et 2050.", "warning"); 
            controleAnneeDebutInput.value = currentPeriodStartYear;
        }
    }

    async function _handleAjouterAbsence() {
        const type = saisieTypeAbsenceSelect.value;
        const startDate = saisieDateDebutInput.value;
        const endDate = saisieDateFinInput.value || startDate; 

        if (!type || !startDate) {
            showToast("Veuillez sélectionner un type et une date de début.", "warning");
            return;
        }
        if (endDate < startDate) {
            showToast("La date de fin ne peut pas être antérieure à la date de début.", "error");
            return;
        }

        const reqStartD = parseYYYYMMDD(startDate);
        const reqEndD = parseYYYYMMDD(endDate);
        if (!reqStartD || !reqEndD) {
            showToast("Format de date invalide.", "error"); return;
        }

        const holidaysSet = new Set();
        for (let y = reqStartD.getFullYear(); y <= reqEndD.getFullYear(); y++) {
            const rawHolidays = getFrenchHolidays(y); // Get raw holidays for the year
            if (Array.isArray(rawHolidays)) { // Check if it's an array
                rawHolidays.forEach(h => {
                    if (h && h.date) holidaysSet.add(h.date); // Add date if object and date property exist
                });
            } else {
                // console.warn(`_handleAjouterAbsence: getFrenchHolidays(${y}) did not return an array.`);
            }
        }
        const days = _countBusinessDays(startDate, endDate, holidaysSet);
        if (days === 0) {
            showToast("Aucun jour ouvrable sélectionné dans cette période.", "info");
            return;
        }
        
        const overlap = allLeaveRequests.some(req => 
            req.type === type && 
            !(endDate < req.startDate || startDate > req.endDate)
        );
        if (overlap) {
            if (!confirm("Une demande de ce type existe déjà sur cette période. Voulez-vous continuer ?")) {
                return;
            }
        }
        
        const droits = leaveTypesConfig[type]?.initialRightsPerYear || 0;
        const joursPrisDeja = _calculateJoursPrisPourType(type, currentPeriodStartYear);
        if ((joursPrisDeja + days) > droits) {
            showToast(`Solde insuffisant pour "${leaveTypesConfig[type].label}". Requis: ${days}, Disponible: ${droits - joursPrisDeja}`, "error");
            return;
        }

        const newRequest = {
            id: `req_${Date.now()}`,
            type: type,
            startDate: startDate,
            endDate: endDate,
            days: days,
            comment: "", 
            status: "APPROUVEE"
        };

        allLeaveRequests.push(newRequest);
        await _saveAllLeaveRequests();
        showToast(`${days} jour(s) de "${leaveTypesConfig[type].label}" ajouté(s).`, "success");
        
        await _renderBalances();
        _renderCustomAnnualCalendar();
    }

    function _handleRetirerAbsence() {
        const type = saisieTypeAbsenceSelect.value;
        const startDate = saisieDateDebutInput.value;
        const endDate = saisieDateFinInput.value || startDate;
        
        if (!type || !startDate) {
            showToast("Veuillez sélectionner un type et une date de début pour identifier l'absence à retirer.", "warning");
            return;
        }
        
        const initialLength = allLeaveRequests.length;
        allLeaveRequests = allLeaveRequests.filter(req => 
            !(req.type === type && req.startDate === startDate && req.endDate === endDate)
        );

        if (allLeaveRequests.length < initialLength) {
            _saveAllLeaveRequests();
            showToast("Absence correspondante retirée.", "info");
            _renderBalances();
            _renderCustomAnnualCalendar();
            saisieAbsencesForm.reset(); 
             _populateSaisieTypeAbsenceSelect();
        } else {
            showToast("Aucune absence correspondante trouvée pour les critères saisis.", "warning");
        }
    }


    function _exportCongesDataToJson() { 
        const dataToExport = { version: "congesApp_v1.1_imgMatch", currentPeriodStartYear, leaveTypesConfig, allLeaveRequests }; 
        try { 
            const dataStr = JSON.stringify(dataToExport, null, 2); 
            const dataBlob = new Blob([dataStr], {type: "application/json"}); 
            const url = URL.createObjectURL(dataBlob); 
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = `conges_data_${dateToYYYYMMDD(new Date())}.json`; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); 
            showToast("Données congés exportées !", "success"); 
        } catch (error) { console.error("Erreur export JSON:", error); showToast("Erreur export.", "error"); }
    }
    async function _importCongesDataFromJson(event) { 
        const file = event.target.files[0]; if (!file) { showToast("Aucun fichier.", "info"); return; } 
        const reader = new FileReader(); 
        reader.onload = async function(e) { 
            try { 
                const importedData = JSON.parse(e.target.result); 
                if (!importedData || !importedData.version || typeof importedData.currentPeriodStartYear !== 'number' || !importedData.leaveTypesConfig || !Array.isArray(importedData.allLeaveRequests)) { 
                    throw new Error("Format fichier invalide ou données manquantes."); 
                } 
                if (!confirm("Les données actuelles seront écrasées par les données importées. Continuer ?")) { 
                    importCongesFileInput.value = ""; return; 
                } 
                currentPeriodStartYear = importedData.currentPeriodStartYear; 
                const importedTypesConfig = importedData.leaveTypesConfig; 
                leaveTypesConfig = { ...JSON.parse(JSON.stringify(defaultLeaveTypes)) }; 
                if (importedTypesConfig && typeof importedTypesConfig === 'object') { 
                    for (const code in importedTypesConfig) { 
                        leaveTypesConfig[code] = { ...(leaveTypesConfig[code] || {}), ...importedTypesConfig[code], isPredefined: !!(defaultLeaveTypes[code]?.isPredefined), deletable: defaultLeaveTypes[code] ? !!defaultLeaveTypes[code].deletable : true }; 
                    } 
                } 
                allLeaveRequests = importedData.allLeaveRequests; 
                await _saveLeaveTypesConfig(); 
                await _saveAllLeaveRequests(); 
                if (controleAnneeDebutInput) controleAnneeDebutInput.value = currentPeriodStartYear; 
                showToast("Données congés importées ! Rafraîchissement...", "success"); 
                _populateSaisieTypeAbsenceSelect(); 
                _renderLeaveTypesConfigTable(); 
                _renderLegend(); 
                _updatePeriodeAffichee(); 
                await _renderBalances(); 
                _renderCustomAnnualCalendar(); 
            } catch (error) { 
                console.error("Erreur import JSON:", error); 
                showToast("Erreur import: " + error.message, "error"); 
            } finally { 
                importCongesFileInput.value = ""; 
            } 
        }; 
        reader.onerror = function() { showToast("Erreur lecture fichier.", "error"); importCongesFileInput.value = ""; }; 
        reader.readAsText(file);
    }
    function _handlePrintView() { 
        showToast("Préparation de l'impression... Veuillez utiliser les options d'impression de votre navigateur.", "info"); 
        window.print();
    }
    
    function _setupEventListeners() {
        if(actualiserPeriodeBtn) actualiserPeriodeBtn.addEventListener('click', _handleActualiserPeriode);
        if(controleAnneeDebutInput) controleAnneeDebutInput.addEventListener('change', _updatePeriodeAffichee);

        if(exportCongesBtn) exportCongesBtn.addEventListener('click', _exportCongesDataToJson);
        if(importCongesFileInput) importCongesFileInput.addEventListener('change', _importCongesDataFromJson);
        if(imprimerVueBtn) imprimerVueBtn.addEventListener('click', _handlePrintView);
        
        if(ajouterAbsenceBtn) ajouterAbsenceBtn.addEventListener('click', _handleAjouterAbsence);
        if(retirerAbsenceBtn) retirerAbsenceBtn.addEventListener('click', _handleRetirerAbsence);

        if (afficherParamBtn && leaveTypesConfigContentWrapper) {
            afficherParamBtn.addEventListener('click', () => {
                const isVisible = leaveTypesConfigContentWrapper.style.display === 'block';
                leaveTypesConfigContentWrapper.style.display = isVisible ? 'none' : 'block';
                afficherParamBtn.textContent = isVisible ? 'Afficher Param.' : 'Masquer Param.';
            });
        }
        if (leaveTypeConfigForm) {
            leaveTypeConfigForm.addEventListener('submit', _handleSaveLeaveTypeConfig);
            const clearLtConfigFormBtn = document.getElementById('clearLtConfigFormBtn');
            if(clearLtConfigFormBtn) clearLtConfigFormBtn.addEventListener('click', _resetLeaveTypeConfigForm);
        }
    }

    async function initializeCongesModule() {
        await _loadLeaveTypesConfig();
        await _loadAllLeaveRequests();
        
        if (controleAnneeDebutInput) controleAnneeDebutInput.value = currentPeriodStartYear;
        _updatePeriodeAffichee(); 

        _populateSaisieTypeAbsenceSelect();
        _renderLeaveTypesConfigTable(); 
        _renderLegend();
        
        await _renderBalances(); 
        _renderCustomAnnualCalendar(); // This was the failing point

        _setupEventListeners(); 
        console.log("Module Congés (V_ImageMatch) initialisé.");
    }

    initializeCongesModule().catch(err => {
        console.error("Erreur fatale lors de l'initialisation du module Congés:", err);
        const errorMsgInit = "Erreur fatale à l'initialisation des Congés.";
        if(typeof showToast === 'function') showToast(errorMsgInit + " " + err.message, "error", 15000); // Add error message
        else alert(errorMsgInit + " " + err.message);
    });
});