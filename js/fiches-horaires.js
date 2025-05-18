// Module Fiches Horaires (Version V37 - Correction complète affichage jours et report)
console.log("Module Fiches Horaires V37 chargé.");

(function() {
    // --- Constantes ---
    const USER_DATA_KEY = 'userData';
    const DETAILED_TIMESHEET_KEY_PREFIX = 'detailedTimesheet_v1_';
    const WEEKLY_CUMUL_KEY_PREFIX = 'weekCumul_v1_';
    const PUNCH_HISTORY_KEY = 'punchHistory_v5_simple_dayOnly';
    const DAILY_THEORETICAL_TIME_KEY = 'dailyTheoreticalTime_v1';

    // --- Variables globales ---
    let dailyTheoreticalWorkMs = 7 * 3600000 + 48 * 60000; // 7h48
    let currentWeekDetailedData = null;

    // --- Éléments DOM ---
    const weekSelector = document.getElementById('weekSelector');
    const viewTimesheetBtn = document.getElementById('viewTimesheetBtn');
    const printTimesheetBtn = document.getElementById('printTimesheetBtn');
    const dailyTheoreticalTimeInput = document.getElementById('dailyTheoreticalTime');
    const userInfoNameInputEl = document.getElementById('userInfoNameInput');
    const userInfoAgentIdInputEl = document.getElementById('userInfoAgentIdInput');
    const agentDateDisplayEl = document.getElementById('agentDateDisplay');
    const weekStartDateDisplayEl = document.getElementById('weekStartDateDisplay');
    const weekEndDateDisplayEl = document.getElementById('weekEndDateDisplay');
    const timesheetTableBody = document.querySelector('#timesheetTable tbody');
    const prevWeekCumulInputEl = document.getElementById('prevWeekCumulInput');
    const weekTotalNetCumulCell = document.getElementById('weekTotalNetCumul');

    const daysOfWeek = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

    // --- Fonctions utilitaires de temps ---
    function formatMsToSignedHHMMString(ms, alwaysShowSign = false) {
        if (typeof ms !== 'number' || isNaN(ms)) return '00:00';
        let sign = "";
        if (ms < 0) {
            sign = "-";
        } else if (ms > 0 && alwaysShowSign) {
            sign = "+";
        } else if (ms === 0 && alwaysShowSign && ms !== 0) { 
            sign = "+"; 
        }
        const absMs = Math.abs(ms);
        const hours = Math.floor(absMs / 3600000);
        const minutes = Math.floor((absMs % 3600000) / 60000);
        return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function parseTimeToMs(timeString) {
        if (!timeString || typeof timeString !== 'string' || timeString.trim() === '') return 0;
        const isNegative = timeString.startsWith('-');
        const isPositive = timeString.startsWith('+');
        const absTimeString = timeString.replace('-', '').replace('+', '');
        const timeParts = absTimeString.trim().split(':');
        if (timeParts.length !== 2) { return 0; }
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) { return 0; }
        let totalMs = (hours * 3600000) + (minutes * 60000);
        if (isNegative) return -totalMs;
        return totalMs;
    }

    // --- Fonctions pour la gestion des dates ---
    function getISOWeek(date) { const d = new Date(date.getTime()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const yearStart = new Date(d.getFullYear(), 0, 1); const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); const year = d.getFullYear(); return `${year}-W${String(weekNo).padStart(2, '0')}`; }
    function getDateFromISOWeek(isoWeekString) { const parts = isoWeekString.match(/^(\d{4})-W(\d{2})$/); if (!parts) return null; const year = parseInt(parts[1], 10); const week = parseInt(parts[2], 10); const d = new Date(year, 0, 1); const dayOfWeek = d.getDay(); const firstMonday = new Date(year, 0, 1 + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek)); const targetMonday = new Date(firstMonday.getTime()); targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7); targetMonday.setHours(0, 0, 0, 0); return targetMonday; }
    function getWeekRange(mondayDate) { if (!(mondayDate instanceof Date) || isNaN(mondayDate.getTime())) return { startOfWeek: null, endOfWeek: null }; const startOfWeek = new Date(mondayDate); startOfWeek.setHours(0,0,0,0); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999); return { startOfWeek, endOfWeek }; }
    function getISODate(date) { if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''; const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }

    // --- Fonctions pour la gestion des données ---
    async function getPreviousWeekCumulFromStorage(weekValue) {
        if (!weekValue) return 0;
        const parts = weekValue.match(/^(\d{4})-W(\d{2})$/);
        if (!parts) return 0;
        const year = parseInt(parts[1], 10); let week = parseInt(parts[2], 10);
        let prevWeekISO = weekValue;
        if (week <= 1) { const dec28PrevYear = new Date(year - 1, 11, 28); prevWeekISO = getISOWeek(dec28PrevYear);
        } else { prevWeekISO = `${year}-W${String(week - 1).padStart(2, '0')}`; }
        try {
            const prevWeekCumul = await localforage.getItem(`${WEEKLY_CUMUL_KEY_PREFIX}${prevWeekISO}`);
            return prevWeekCumul || 0;
        } catch (err) { console.error("Erreur récup cumul précédent stockage:", err); return 0; }
    }
    async function saveWeekCumul(weekValue, cumulMs) {
        if (!weekValue) return;
        try { await localforage.setItem(`${WEEKLY_CUMUL_KEY_PREFIX}${weekValue}`, cumulMs); }
        catch (err) { console.error("Erreur sauvegarde cumul semaine:", err); }
    }
    async function saveDetailedWeekData(weekValue, data) {
        if (!weekValue || !data) return;
        try { await localforage.setItem(`${DETAILED_TIMESHEET_KEY_PREFIX}${weekValue}`, data); }
        catch (err) { console.error("Erreur sauvegarde données détaillées:", err); }
    }
    async function loadDetailedWeekData(weekValue) {
        if (!weekValue) return null;
        try {
            const savedDetailedData = await localforage.getItem(`${DETAILED_TIMESHEET_KEY_PREFIX}${weekValue}`);
            if (savedDetailedData) {
                console.log(`[FH Load V37] Données détaillées trouvées pour ${weekValue}.`);
                if (!savedDetailedData.days || savedDetailedData.days.length < 7) {
                    console.warn(`[FH Load V37] Données pour ${weekValue} incomplètes. Re-initialisation.`);
                    const mondayOfSelectedWeek = getDateFromISOWeek(weekValue); if (!mondayOfSelectedWeek) return null;
                    const completeDetailedData = { week: weekValue, days: [] };
                    const existingDaysMap = new Map(savedDetailedData.days?.map(day => [day.date, day]) || []);
                    for(let i = 0; i < 7; i++) { const dayDate = new Date(mondayOfSelectedWeek); dayDate.setDate(dayDate.getDate() + i); const dayISODate = getISODate(dayDate); const existingDayData = existingDaysMap.get(dayISODate); completeDetailedData.days.push(existingDayData || { date: dayISODate, startMorning: '00:00', endMorning: '00:00', startAfternoon: '00:00', endAfternoon: '00:00', observations: '' });}
                    return completeDetailedData;
                }
                return savedDetailedData;
            } else {
                console.log(`[FH Load V37] Pas de données détaillées pour ${weekValue}. Pré-remplissage.`);
                const mondayOfSelectedWeek = getDateFromISOWeek(weekValue); if (!mondayOfSelectedWeek) return null;
                const allPunchHistory = await localforage.getItem(PUNCH_HISTORY_KEY) || [];
                const detailedData = { week: weekValue, days: [] };
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(mondayOfSelectedWeek); dayDate.setDate(dayDate.getDate() + i);
                    const dayISODate = getISODate(dayDate);
                    const dayEntry = { date: dayISODate, startMorning: '00:00', endMorning: '00:00', startAfternoon: '00:00', endAfternoon: '00:00', observations: '' };
                    const punchRecord = allPunchHistory.find(p => p.date === dayISODate);
                    if (punchRecord) {
                        if (punchRecord.dayStart) { try { const t = new Date(punchRecord.dayStart); if(getISODate(t)===dayISODate) dayEntry.startMorning = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; } catch(e){} }
                        if (punchRecord.dayEnd) { try { const t = new Date(punchRecord.dayEnd); if(getISODate(t)===dayISODate) dayEntry.endAfternoon = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; } catch(e){} }
                        if (dayEntry.startMorning !== '00:00' && dayEntry.endAfternoon !== '00:00') { dayEntry.endMorning = '12:00'; dayEntry.startAfternoon = '13:00'; }
                    }
                    detailedData.days.push(dayEntry);
                }
                await saveDetailedWeekData(weekValue, detailedData);
                return detailedData;
            }
        } catch (err) { console.error("Erreur loadDetailedWeekData:", err); return null; }
    }

    // --- Fonctions d'affichage et de calcul ---
    async function renderTimesheetTable(detailedWeekData) {
        console.log("[FH Render V37] Début renderTimesheetTable.");
        if (!timesheetTableBody) { console.error("[FH Render] ERREUR: timesheetTableBody est null !"); return; }
        timesheetTableBody.innerHTML = '';
        if (!detailedWeekData || !detailedWeekData.days || detailedWeekData.days.length < 7) {
             console.warn("[FH Render] Données détaillées de semaine incomplètes."); return;
        }
        const weekValue = detailedWeekData.week;
         if (weekValue) {
            const mondayOfSelectedWeek = getDateFromISOWeek(weekValue);
            if (mondayOfSelectedWeek) {
                const weekRange = getWeekRange(mondayOfSelectedWeek);
                if (weekStartDateDisplayEl) weekStartDateDisplayEl.textContent = weekRange.startOfWeek.toLocaleDateString('fr-FR');
                if (weekEndDateDisplayEl) weekEndDateDisplayEl.textContent = weekRange.endOfWeek.toLocaleDateString('fr-FR');
            }
        }

        const daysToRender = 5; 
        for (let i = 0; i < daysToRender; i++) {
            const dayData = detailedWeekData.days[i];
            const row = timesheetTableBody.insertRow();
            
            const dayCell = row.insertCell(); 
            dayCell.textContent = daysOfWeek[i]; 
            dayCell.className = 'day-col';
            // console.log(`[FH Render V37] Jour ${i}: Cellule créée, texte "${daysOfWeek[i]}"`); // Déjà présent dans V33

            createEditableTimeCell(row, 'startMorningHours', i, dayData.startMorning.split(':')[0] || '00', 'time-cell');
            createEditableTimeCell(row, 'startMorningMinutes', i, dayData.startMorning.split(':')[1] || '00', 'time-cell');
            createEditableTimeCell(row, 'endMorningHours', i, dayData.endMorning.split(':')[0] || '00', 'time-cell');
            createEditableTimeCell(row, 'endMorningMinutes', i, dayData.endMorning.split(':')[1] || '00', 'time-cell');
            row.insertCell().className = 'time-cell total-col'; 
            row.insertCell().className = 'time-cell total-col'; 
            createEditableTimeCell(row, 'startAfternoonHours', i, dayData.startAfternoon.split(':')[0] || '00', 'time-cell');
            createEditableTimeCell(row, 'startAfternoonMinutes', i, dayData.startAfternoon.split(':')[1] || '00', 'time-cell');
            createEditableTimeCell(row, 'endAfternoonHours', i, dayData.endAfternoon.split(':')[0] || '00', 'time-cell');
            createEditableTimeCell(row, 'endAfternoonMinutes', i, dayData.endAfternoon.split(':')[1] || '00', 'time-cell');
            row.insertCell().className = 'time-cell total-col'; 
            row.insertCell().className = 'time-cell total-col'; 
            row.insertCell().className = 'time-cell total-col'; 
            row.insertCell().className = 'time-cell total-col'; 
            const cumulCell = row.insertCell(); 
            cumulCell.className = 'time-cell-single cumul-col cumul-daily-value';
            const obsCell = row.insertCell(); obsCell.className = 'obs-col';
            const obsInput = document.createElement('input'); obsInput.type = 'text'; obsInput.className = 'obs-input';
            obsInput.dataset.day = i; obsInput.dataset.field = 'observation'; obsInput.value = dayData.observations || '';
            obsInput.addEventListener('change', handleCellChange); obsCell.appendChild(obsInput);
            row.insertCell().className = 'leave-col'; 
            row.insertCell().className = 'absence-col';
            
            recalculateDayRow(row, dayData); 
        }
        await updateCumulsAndTotal(); 
        console.log("[FH Render V37] Fin renderTimesheetTable.");
    }

    function createEditableTimeCell(row, fieldName, dayIndex, defaultValue, className) {
        const cell = row.insertCell(); cell.className = className;
        const input = document.createElement('input'); input.type = 'text'; input.className = 'editable-cell-input';
        input.maxLength = 2; input.dataset.day = dayIndex; input.dataset.field = fieldName;
        input.value = String(defaultValue).padStart(2, '0');
        input.setAttribute('data-previous-value', input.value); 
        input.addEventListener('change', handleCellChange);
        input.addEventListener('input', function(e) {
            const value = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = value.substring(0, 2);
        });
        input.addEventListener('blur', function(e) {
             let formattedValue = e.target.value;
             if (formattedValue.length === 1) formattedValue = '0' + formattedValue;
             else if (formattedValue.length === 0) formattedValue = '00';
             if (formattedValue !== input.getAttribute('data-previous-value')) {
                 e.target.value = formattedValue;
                 input.setAttribute('data-previous-value', formattedValue);
                 setTimeout(() => { input.dispatchEvent(new Event('change', { bubbles: true })); }, 0);
             } else { e.target.value = formattedValue; }
        });
        cell.appendChild(input); return cell;
    }

    function recalculateDayRow(row, dayData) {
        if (!row || !dayData) { return 0; }
        try {
            const startMorningMs = parseTimeToMs(dayData.startMorning);
            const endMorningMs = parseTimeToMs(dayData.endMorning);
            const startAfternoonMs = parseTimeToMs(dayData.startAfternoon);
            const endAfternoonMs = parseTimeToMs(dayData.endAfternoon);
            let morningDurationMs = endMorningMs >= startMorningMs ? endMorningMs - startMorningMs : 0;
            let afternoonDurationMs = endAfternoonMs >= startAfternoonMs ? endAfternoonMs - startAfternoonMs : 0;
            morningDurationMs = Math.max(0, morningDurationMs); afternoonDurationMs = Math.max(0, afternoonDurationMs);
            const totalDayMs = morningDurationMs + afternoonDurationMs;
            row.cells[5].textContent = String(Math.floor(morningDurationMs / 3600000)).padStart(2, '0');
            row.cells[6].textContent = String(Math.floor((morningDurationMs % 3600000) / 60000)).padStart(2, '0');
            row.cells[11].textContent = String(Math.floor(afternoonDurationMs / 3600000)).padStart(2, '0');
            row.cells[12].textContent = String(Math.floor((afternoonDurationMs % 3600000) / 60000)).padStart(2, '0');
            row.cells[13].textContent = String(Math.floor(totalDayMs / 3600000)).padStart(2, '0');
            row.cells[14].textContent = String(Math.floor((totalDayMs % 3600000) / 60000)).padStart(2, '0');
            return totalDayMs;
        } catch (err) { console.error(`Erreur recalcul ligne (${dayData?.date}):`, err); return 0; }
    }

    async function handleCellChange(event) {
        const input = event.target; const dayIndex = parseInt(input.dataset.day, 10);
        const field = input.dataset.field; const value = input.value.trim();
        input.setAttribute('data-previous-value', value);

        if (dayIndex < 0 || dayIndex >= 5 || !currentWeekDetailedData || !currentWeekDetailedData.days || !currentWeekDetailedData.days[dayIndex]) {
             if(typeof showToast === 'function') showToast("Erreur interne.", "error"); return;
        }
        const dayData = currentWeekDetailedData.days[dayIndex];
        if (field === 'observation') {
            dayData.observations = value;
            await saveDetailedWeekData(currentWeekDetailedData.week, currentWeekDetailedData);
            if(typeof showToast === 'function') showToast(`Observation sauvegardée.`, "info");
        } else {
            const timePart = field.includes('Hours') ? 'Hours' : 'Minutes';
            const segment = field.replace(timePart, '');
            let currentTimeString = dayData[segment];
            if (!currentTimeString || !currentTimeString.includes(':')) currentTimeString = '00:00';
            let [hours, minutes] = currentTimeString.split(':'); 

            if (timePart === 'Hours') hours = value; else minutes = value;
            
            dayData[segment] = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
            
            const row = timesheetTableBody.rows[dayIndex];
            if(row) recalculateDayRow(row, dayData);
            await updateCumulsAndTotal();
            if(typeof showToast === 'function') showToast(`Horaire mis à jour.`, "success");
        }
    }
    
    async function updateCumulsAndTotal() {
        console.log("[FH Cumul V37] Début updateCumulsAndTotal.");
        if (!currentWeekDetailedData || !currentWeekDetailedData.days || !currentWeekDetailedData.days.length) return;
        const weekValue = currentWeekDetailedData.week;
        if (!weekValue) return;

        let previousWeekCumulMs = 0;
        if (prevWeekCumulInputEl) {
            previousWeekCumulMs = parseTimeToMs(prevWeekCumulInputEl.value); 
            prevWeekCumulInputEl.classList.remove('positive-time', 'negative-time');
            if (previousWeekCumulMs > 0) prevWeekCumulInputEl.classList.add('positive-time');
            else if (previousWeekCumulMs < 0) prevWeekCumulInputEl.classList.add('negative-time');
        } else {
            previousWeekCumulMs = await getPreviousWeekCumulFromStorage(weekValue);
        }

        let totalWorkingDaysDeviationMs = 0;
        const displayedDaysInTable = 5;

        for (let i = 0; i < currentWeekDetailedData.days.length; i++) {
            const dayData = currentWeekDetailedData.days[i];
            const startMorningMs = parseTimeToMs(dayData.startMorning);
            const endMorningMs = parseTimeToMs(dayData.endMorning);
            const startAfternoonMs = parseTimeToMs(dayData.startAfternoon);
            const endAfternoonMs = parseTimeToMs(dayData.endAfternoon);
            let morningDurationMs = endMorningMs >= startMorningMs ? endMorningMs - startMorningMs : 0;
            let afternoonDurationMs = endAfternoonMs >= startAfternoonMs ? endAfternoonMs - startAfternoonMs : 0;
            const dayTotalWorkMs = Math.max(0, morningDurationMs) + Math.max(0, afternoonDurationMs);

            let dayDeviationMs = 0;
            if (i < displayedDaysInTable) { 
                dayDeviationMs = dayTotalWorkMs - dailyTheoreticalWorkMs;
                const row = timesheetTableBody.rows[i];
                if(row && row.cells[15]) { 
                    const cumulCell = row.cells[15];
                    cumulCell.textContent = formatMsToSignedHHMMString(dayDeviationMs, true); 
                    cumulCell.className = 'time-cell-single cumul-col cumul-daily-value';
                    cumulCell.classList.remove('positive-time', 'negative-time'); 
                    if (dayDeviationMs > 0) cumulCell.classList.add('positive-time');
                    else if (dayDeviationMs < 0) cumulCell.classList.add('negative-time');
                }
                totalWorkingDaysDeviationMs += dayDeviationMs;
            }
        }
        const finalOverallCumulMs = previousWeekCumulMs + totalWorkingDaysDeviationMs;
        if (weekTotalNetCumulCell) {
            weekTotalNetCumulCell.textContent = formatMsToSignedHHMMString(finalOverallCumulMs, true); 
            weekTotalNetCumulCell.classList.remove('positive-time', 'negative-time');
            if (finalOverallCumulMs >= 0) weekTotalNetCumulCell.classList.add('positive-time');
            else if (finalOverallCumulMs < 0) weekTotalNetCumulCell.classList.add('negative-time');
        }
        await saveDetailedWeekData(weekValue, currentWeekDetailedData);
        await saveWeekCumul(weekValue, finalOverallCumulMs);
        console.log("[FH Cumul V37] Cumuls mis à jour et sauvegardés.");
    }
    
    async function loadAndDisplayTimesheet() {
         console.log("[FH Load V37] Début chargement et affichage.");
         const selectedWeekValue = weekSelector.value;
         if (!selectedWeekValue) { if(typeof showToast === 'function') showToast("Veuillez sélectionner une semaine.", "warning"); return; }

         if (prevWeekCumulInputEl) {
             const storedPrevWeekCumulMs = await getPreviousWeekCumulFromStorage(selectedWeekValue);
             prevWeekCumulInputEl.value = formatMsToSignedHHMMString(storedPrevWeekCumulMs, true); 
             prevWeekCumulInputEl.classList.remove('positive-time', 'negative-time');
             if (storedPrevWeekCumulMs > 0) prevWeekCumulInputEl.classList.add('positive-time');
             else if (storedPrevWeekCumulMs < 0) prevWeekCumulInputEl.classList.add('negative-time');
         }
         currentWeekDetailedData = await loadDetailedWeekData(selectedWeekValue);
         if (currentWeekDetailedData) {
             await renderTimesheetTable(currentWeekDetailedData);
         } else { if(typeof showToast === 'function') showToast("Erreur chargement données.", "error");}
         console.log("[FH Load V37] Fin chargement.");
    }
    async function delayedInitialLoad() {
         console.log("[FH Init V37] Dans le callback delayedInitialLoad.");
         await loadAndDisplayTimesheet();
         console.log("[FH Init V37] Appel initial de loadAndDisplayTimesheet terminé.");
    }
    
    async function initializePage() {
        console.log("[FH Init V37] Début initialisation.");
        const userData = await localforage.getItem(USER_DATA_KEY) || { name: "", agentId: "" };
        if (userInfoNameInputEl) userInfoNameInputEl.value = userData.name || "";
        if (userInfoAgentIdInputEl) userInfoAgentIdInputEl.value = userData.agentId || "";

        if(userInfoNameInputEl) { userInfoNameInputEl.addEventListener('change', async (e) => { const d=await localforage.getItem(USER_DATA_KEY)||{}; d.name=e.target.value; await localforage.setItem(USER_DATA_KEY,d); if(typeof showToast==='function')showToast("Nom MàJ.","info");});}
        if(userInfoAgentIdInputEl) { userInfoAgentIdInputEl.addEventListener('change', async (e) => { const d=await localforage.getItem(USER_DATA_KEY)||{}; d.agentId=e.target.value; await localforage.setItem(USER_DATA_KEY,d); if(typeof showToast==='function')showToast("N° Agent MàJ.","info");});}
        if (agentDateDisplayEl) { const today = new Date(); agentDateDisplayEl.textContent = today.toLocaleDateString('fr-FR');}
        
        const todayForWeek = new Date();
        if (weekSelector) { weekSelector.value = getISOWeek(todayForWeek); }

        if (dailyTheoreticalTimeInput) {
             const savedTheoreticalTime = await localforage.getItem(DAILY_THEORETICAL_TIME_KEY);
             dailyTheoreticalTimeInput.value = savedTheoreticalTime || "07:48";
             dailyTheoreticalWorkMs = parseTimeToMs(dailyTheoreticalTimeInput.value) || parseTimeToMs("07:48");
             dailyTheoreticalTimeInput.addEventListener('change', async () => {
                 const newTime = dailyTheoreticalTimeInput.value.trim();
                 const newDailyTheoreticalWorkMs = parseTimeToMs(newTime);
                 if (newDailyTheoreticalWorkMs >= 0) { 
                     dailyTheoreticalWorkMs = newDailyTheoreticalWorkMs;
                     await localforage.setItem(DAILY_THEORETICAL_TIME_KEY, newTime);
                     if(typeof showToast === 'function') showToast(`Temps théorique MàJ: ${newTime}`, "info");
                     await loadAndDisplayTimesheet();
                 } else {
                      dailyTheoreticalTimeInput.value = formatMsToSignedHHMMString(dailyTheoreticalWorkMs);
                      if(typeof showToast === 'function') showToast("Format temps théorique invalide.", "error");
                 }
             });
        }
        
        if (prevWeekCumulInputEl) {
            prevWeekCumulInputEl.addEventListener('change', async () => {
                const value = prevWeekCumulInputEl.value.trim();
                const regex = /^[+-]?\d{1,}:\d{2}$/; 
                if (regex.test(value)) {
                    const msValue = parseTimeToMs(value);
                    prevWeekCumulInputEl.value = formatMsToSignedHHMMString(msValue, true); 
                    prevWeekCumulInputEl.classList.remove('positive-time', 'negative-time');
                    if (msValue > 0) prevWeekCumulInputEl.classList.add('positive-time');
                    else if (msValue < 0) prevWeekCumulInputEl.classList.add('negative-time');
                    await updateCumulsAndTotal();
                    if(typeof showToast === 'function') showToast("Report de cumul mis à jour.", "info");
                } else {
                    if(typeof showToast === 'function') showToast("Format du report invalide (ex: 01:30, -00:45, +02:00).", "error");
                    const storedPrevWeekCumulMs = await getPreviousWeekCumulFromStorage(weekSelector.value);
                    prevWeekCumulInputEl.value = formatMsToSignedHHMMString(storedPrevWeekCumulMs, true);
                    prevWeekCumulInputEl.classList.remove('positive-time', 'negative-time');
                    if (storedPrevWeekCumulMs > 0) prevWeekCumulInputEl.classList.add('positive-time');
                    else if (storedPrevWeekCumulMs < 0) prevWeekCumulInputEl.classList.add('negative-time');
                }
            });
        }
        setupEventListeners();
        setTimeout(delayedInitialLoad, 50);
        console.log("[FH Init V37] Initialisation terminée.");
    }
    
    function setupEventListeners() {
        console.log("[FH Setup V37] Attachement des écouteurs.");
        if (viewTimesheetBtn) viewTimesheetBtn.addEventListener('click', loadAndDisplayTimesheet);
        if (weekSelector) weekSelector.addEventListener('change', loadAndDisplayTimesheet);
        if (printTimesheetBtn) { console.log("[FH Setup V37] Bouton print géré par impression.js");}
    }

    // --- Lancement ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("[FH Launch V37] DOMContentLoaded. Init.");
        initializePage().catch(err => {
            console.error("[FH Launch V37] Erreur init:", err);
            if(typeof showToast === 'function') showToast("Erreur Init Fiches Horaires.", "error", 15000);
        });
    });
})();