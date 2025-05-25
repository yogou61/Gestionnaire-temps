// Script d'impression - Version V29 (Réalignement semaine, Centrage vertical global)
console.log("Module Impression - Version V29 (Réalignement semaine, Centrage vertical global) chargé.");

(function() {
    const PRINT_BUTTON_ID = 'printTimesheetBtn';
    const USER_DATA_KEY = 'userData';

    async function handleOptimizedPrint() {
        console.log("[Impression V29] Lancement impression optimisée");

        const timesheetTable = document.getElementById('timesheetTable');
        const printableArea = document.getElementById('printableTimesheetArea');
        const tableBody = timesheetTable?.querySelector('tbody');
        
        if (!timesheetTable || !printableArea || !tableBody || tableBody.children.length === 0) {
            console.error("[Impression V29] Données manquantes pour l'impression.");
            if (typeof AppUtils !== 'undefined' && AppUtils.showToast) {
                AppUtils.showToast("Erreur: Veuillez d'abord sélectionner une semaine et générer la fiche.", "error");
            }
            return;
        }

        console.log("[Impression V29] Ouverture nouvelle fenêtre pour impression");
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
            alert("Popup bloqué ! Autorisez les popups pour cette page afin de pouvoir imprimer.");
            return;
        }

        let userData = { name: "", agentId: "" };
        try {
            if (typeof localforage !== 'undefined') {
                userData = await localforage.getItem(USER_DATA_KEY) || { name: "", agentId: "" };
            }
        } catch (err) {
            console.error("[Impression V29] Erreur récupération données utilisateur:", err);
        }

        const timeInputs = printableArea.querySelectorAll('input.editable-cell-input');
        timeInputs.forEach(input => input.setAttribute('value', input.value));
        const obsInputs = printableArea.querySelectorAll('input.obs-input');
        obsInputs.forEach(input => input.setAttribute('value', input.value));
        const prevWeekCumulInput = printableArea.querySelector('#prevWeekCumulInput');
        if (prevWeekCumulInput) prevWeekCumulInput.setAttribute('value', prevWeekCumulInput.value);
        
        let printableContent = printableArea.innerHTML;
        
        if (userData.name) {
            printableContent = printableContent.replace(/(<input[^>]*id="userInfoNameInput"[^>]*value=")[^"]*(")/g,`$1${userData.name}$2`);
            printableContent = printableContent.replace(/(<input[^>]*id="userInfoNameInput"[^>]*)(\splaceholder="[^"]*")?/g, (match, p1) => p1.includes('value="') ? match : `${p1} value="${userData.name}"`);
        }
        if (userData.agentId) {
            printableContent = printableContent.replace(/(<input[^>]*id="userInfoAgentIdInput"[^>]*value=")[^"]*(")/g, `$1${userData.agentId}$2`);
            printableContent = printableContent.replace(/(<input[^>]*id="userInfoAgentIdInput"[^>]*)(\splaceholder="[^"]*")?/g, (match, p1) => p1.includes('value="') ? match : `${p1} value="${userData.agentId}"`);
        }
        printableContent = printableContent.replace(/(<span id="weekStartDateDisplay"[^>]*>[^<]+<\/span>)\s*(?:"|")?\s*au\s*(?:"|")?\s*(<span id="weekEndDateDisplay")/g, '$1 au $2');
        printableContent = printableContent.replace(/(<span id="weekStartDateDisplay"[^>]*>[^<]+<\/span>)\s*au\s*(<span id="weekEndDateDisplay")/g, '$1 au $2');
        printableContent = printableContent.replace(/"\s*au\s*"/g, ' au ').replace(/"\s*au\s*"/g, ' au ');
        printableContent = printableContent.replace(/<th rowspan="2" class="day-col">SEMAINE<\/th>/g, '<th rowspan="2" class="day-col print-semaine-cell">SEMAINE</th>');

        const fullDocument = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Fiche Horaire</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm; /* Marges d'impression standard */
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 9pt;
            color: #34495e;
            background: white;
            margin: 0; 
            /* MODIFIÉ: Ajout d'un padding-top pour descendre le contenu global */
            padding: 40px 15px 15px 15px; /* Ajuster 40px selon le besoin de descente */
        }
        
        .timesheet-header {
            display: block;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: none !important;
            font-size: 8pt;
        }
        
        .user-info div {
            margin-bottom: 4px;
            display: flex;
            align-items: baseline;
        }
        
        .user-info strong { margin-right: 5px; white-space: nowrap; }
        
        .user-info-input {
            border: none !important; padding: 1px 0; font-size: 1em; 
            font-family: inherit; background-color: transparent !important;
            width: auto; min-width: 100px; color: #34495e;
        }
        .user-info-input.name-input { min-width: 200px; }
        .user-info-input.agent-id-input { min-width: 80px; }
        
        .week-info { /* Ce bloc contient "Semaine du : ..." */
            text-align: left;
            /* MODIFIÉ: Rétablissement d'un margin-top pour le positionnement vertical correct sous "N° AGENT" */
            margin-top: 20px; /* Ajustez cette valeur si besoin. Était 32px dans une version, puis 8px. 20px est un compromis. */
            /* MODIFIÉ: Décalage vers la droite pour aligner avec "Début" */
            padding-left: 75px; /* Cible l'alignement avec la colonne "Début" du tableau. La colonne SEMAINE fait ~70px. Ajuster pour précision. */
        }
        
        .week-info div { margin-bottom: 2px; }
        
        .table-wrapper { border: none !important; margin-top: 8px; margin-bottom: 16px; }
        
        #timesheetTable {
            width: 100%; border-collapse: collapse; border: 1px solid #777 !important;
            font-size: 8pt !important; 
        }
        
        #timesheetTable th, #timesheetTable td {
            border-left: 1px solid #777 !important; border-right: 1px solid #777 !important;
            border-top: none !important; border-bottom: none !important;
            padding: 1px !important; text-align: center; vertical-align: middle; height: 18px;
        }
        
        #timesheetTable thead tr th, #timesheetTable tfoot tr td {
            border-top: 1px solid #777 !important; border-bottom: 1px solid #777 !important;
        }
        #timesheetTable thead tr:first-child th { border-top: 1px solid #777 !important; }
        #timesheetTable tbody tr td:nth-child(16) {
            border-top: 1px solid #777 !important; border-bottom: 1px solid #777 !important;
        }
        
        #timesheetTable thead th { background-color: #D0D0E8; font-weight: bold; }
        
        #timesheetTable thead th.sub-header-time {
            font-size: 7pt; font-weight: normal;
            width: 18px !important; min-width: 18px !important; max-width: 18px !important;
            background-color: #D0D0E8; font-family: inherit; 
        }
        
        #timesheetTable thead th#headerPrevWeekCumulCellContainer { background-color: white; padding: 1px !important; }
        #timesheetTable thead tr:nth-child(2) th:last-child { background-color: white; }
        #timesheetTable thead th.header-obs { text-align: center !important; vertical-align: middle !important; }
        #timesheetTable thead th.leave-col, #timesheetTable thead th.absence-col { background-color: #D0D0E8 !important; }
        
        .day-col {
            width: 70px !important; text-align: left !important; font-weight: bold;
            background-color: #D0D0E8 !important; padding-left: 3px !important;
        }
        .print-semaine-cell { padding-left: 8px !important; padding-top: 6px !important; vertical-align: top !important; }
        
        .time-cell, .sub-header-time { 
            width: 18px !important; min-width: 18px !important; max-width: 18px !important;
            font-family: inherit; font-size: 8pt; padding: 1px !important;
        }
        td.time-cell-single { min-width: 45px; width: 45px; font-weight: bold; }
        
        #timesheetTable tbody tr td:nth-child(6), #timesheetTable tbody tr td:nth-child(7),
        #timesheetTable tbody tr td:nth-child(12), #timesheetTable tbody tr td:nth-child(13) { background-color: #FFFFC0 !important; }
        #timesheetTable tbody tr td:nth-child(14), #timesheetTable tbody tr td:nth-child(15) { background-color: #B0E0E6 !important; }
        #timesheetTable tbody tr td:nth-child(16) { background-color: white !important; }
        
        /* Styles pour les bordures groupées hh/mm - inchangés */
        #timesheetTable td:nth-child(2), #timesheetTable thead tr:nth-child(2) th:nth-child(1), #timesheetTable td:nth-child(4), #timesheetTable thead tr:nth-child(2) th:nth-child(3), #timesheetTable td:nth-child(6), #timesheetTable thead tr:nth-child(2) th:nth-child(5), #timesheetTable td:nth-child(8), #timesheetTable thead tr:nth-child(2) th:nth-child(7), #timesheetTable td:nth-child(10), #timesheetTable thead tr:nth-child(2) th:nth-child(9), #timesheetTable td:nth-child(12), #timesheetTable thead tr:nth-child(2) th:nth-child(11), #timesheetTable td:nth-child(14), #timesheetTable thead tr:nth-child(2) th:nth-child(13) { border-right-style: none !important; padding-right: 1px !important; }
        #timesheetTable td:nth-child(3), #timesheetTable thead tr:nth-child(2) th:nth-child(2), #timesheetTable td:nth-child(5), #timesheetTable thead tr:nth-child(2) th:nth-child(4), #timesheetTable td:nth-child(7), #timesheetTable thead tr:nth-child(2) th:nth-child(6), #timesheetTable td:nth-child(9), #timesheetTable thead tr:nth-child(2) th:nth-child(8), #timesheetTable td:nth-child(11), #timesheetTable thead tr:nth-child(2) th:nth-child(10), #timesheetTable td:nth-child(13), #timesheetTable thead tr:nth-child(2) th:nth-child(12), #timesheetTable td:nth-child(15), #timesheetTable thead tr:nth-child(2) th:nth-child(14) { border-left-style: none !important; padding-left: 1px !important; }

        .leave-col, .absence-col { background-color: white !important; width: 70px !important; min-width: 70px !important; }
        .obs-col { width: 120px !important; text-align: left !important; padding: 0 !important; }
        
        .editable-cell-input {
            width: 95%; height: 16px; line-height: 16px; border: none; background-color: transparent;
            text-align: center; font-family: inherit; font-size: 8pt; 
            padding: 0; margin: 0 auto; box-sizing: border-box; color: #34495e;
        }
        .prev-cumul-input {
            width: calc(100% - 2px) !important; height: calc(100% - 2px) !important;
            text-align: center !important; border: 1px solid #ccc !important;
            padding: 0 !important; font-size: 8pt !important; font-family: inherit; 
            box-sizing: border-box; margin: 0; vertical-align: middle; color: #34495e;
        }
        .obs-input {
            width: 100%; height: 100%; min-height: 16px; border: none; background-color: transparent;
            text-align: left; font-family: inherit; font-size: inherit; 
            padding: 1px 2px; box-sizing: border-box; color: #34495e;
        }
        
        .detailed-timesheet .leave-col, .detailed-timesheet .absence-col { background-color: white !important; }
        .detailed-timesheet tfoot tr { background-color: white; }
        .detailed-timesheet tfoot tr.total-row td {
            font-weight: bold; color: #2c3e50; height: 20px; background-color: white !important;
        }
        .detailed-timesheet tfoot tr.total-row td.label-cell {
            text-align: right !important; padding-right: 10px !important;
            font-weight: bold; border-right: 1px solid #777 !important;
        }
        .detailed-timesheet tfoot tr.total-row #weekTotalNetCumul {
            background-color: white !important; color: #2c3e50; text-align: center !important;
            border-left: 1px solid #777 !important; border-right: 1px solid #777 !important;
        }
        .detailed-timesheet tfoot tr.total-row td:last-child { border-left: 1px solid #777 !important; }
        
        .timesheet-footer { margin-top: 24px; padding-top: 16px; border-top: none !important; font-size: 8pt; }
        .timesheet-footer .signature-area {
            display: flex; flex-direction: column; align-items: flex-start;
            gap: 28px; padding-top: 0; border-top: none !important;
        }
        .timesheet-footer .signature-block { width: 100%; display: flex; align-items: baseline; border: none !important; }
        .timesheet-footer .signature-date-label {
            font-weight: bold; white-space: nowrap; margin: 0; padding: 0;
            min-width: 180px; flex-shrink: 0; border: none !important;
        }
        .timesheet-footer .signature-date-label .signature-actual-date { font-weight: normal; margin-left: 4px; border: none !important; }
        .timesheet-footer .signature-text-label {
            text-align: left; border: none !important; padding: 0; margin: 0;
            min-height: 12px; margin-left: 16px;
        }
    </style>
</head>
<body>
    ${printableContent}
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const nameInput = document.getElementById('userInfoNameInput');
            const agentIdInput = document.getElementById('userInfoAgentIdInput');
            const userNameFromStorage = '${userData.name ? String(userData.name).replace(/'/g, "\\'") : ""}';
            const agentIdFromStorage = '${userData.agentId ? String(userData.agentId).replace(/'/g, "\\'") : ""}';
            if (nameInput && userNameFromStorage) { nameInput.value = userNameFromStorage; nameInput.setAttribute('value', userNameFromStorage); nameInput.style.display = 'inline'; }
            if (agentIdInput && agentIdFromStorage) { agentIdInput.value = agentIdFromStorage; agentIdInput.setAttribute('value', agentIdFromStorage); agentIdInput.style.display = 'inline'; }
        });
    </script>
</body>
</html>`;

        console.log("[Impression V29] Document créé, lancement impression.");
        printWindow.document.write(fullDocument);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            setTimeout(() => {
                printWindow.close();
                if (typeof AppUtils !== 'undefined' && AppUtils.showToast) AppUtils.showToast("Impression terminée.", "success");
            }, 2000); 
        }, 1000); 
    }

    function initPrintModule() {
        const printButton = document.getElementById(PRINT_BUTTON_ID);
        if (printButton) {
            printButton.addEventListener('click', function(event) {
                event.preventDefault(); event.stopPropagation();
                handleOptimizedPrint();
            });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(initPrintModule, 2000));
    else setTimeout(initPrintModule, 2000); 

})();