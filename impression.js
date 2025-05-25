// Script d'impression - Version V26 FINAL avec récupération données utilisateur
console.log("Module Impression - Version V26 FINAL avec données utilisateur chargé.");

(function() {
    const PRINT_BUTTON_ID = 'printTimesheetBtn';
    const USER_DATA_KEY = 'userData';

    async function handleOptimizedPrint() {
        console.log("[Impression V26] Lancement impression optimisée");

        // Vérifications de base
        const timesheetTable = document.getElementById('timesheetTable');
        const printableArea = document.getElementById('printableTimesheetArea');
        const tableBody = timesheetTable?.querySelector('tbody');
        
        if (!timesheetTable || !printableArea || !tableBody || tableBody.children.length === 0) {
            console.error("[Impression V26] Données manquantes");
            if (typeof AppUtils !== 'undefined' && AppUtils.showToast) {
                AppUtils.showToast("Erreur: Veuillez d'abord sélectionner une semaine.", "error");
            }
            return;
        }

        console.log("[Impression V26] Ouverture nouvelle fenêtre pour impression");

        // Ouvrir nouvelle fenêtre
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
            alert("Popup bloqué ! Autorisez les popups pour cette page.");
            return;
        }

        // NOUVEAU V26: Récupérer les données utilisateur depuis localforage
        let userData = { name: "", agentId: "" };
        try {
            if (typeof localforage !== 'undefined') {
                userData = await localforage.getItem(USER_DATA_KEY) || { name: "", agentId: "" };
                console.log("[Impression V26] Données utilisateur récupérées:", userData);
            } else {
                console.warn("[Impression V26] localforage non disponible, données par défaut utilisées");
            }
        } catch (err) {
            console.error("[Impression V26] Erreur récupération données utilisateur:", err);
        }

        // Récupérer le contenu à imprimer
        let printableContent = printableArea.innerHTML;
        
        // NOUVEAU V26: Injecter les données utilisateur dans le HTML avant impression
        console.log("[Impression V26] Injection des données utilisateur...");
        
        // Remplacer les valeurs des inputs par les données sauvegardées
        if (userData.name) {
            printableContent = printableContent.replace(
                /(<input[^>]*id="userInfoNameInput"[^>]*value=")[^"]*(")/g,
                `$1${userData.name}$2`
            );
            printableContent = printableContent.replace(
                /(<input[^>]*id="userInfoNameInput"[^>]*)(placeholder="[^"]*")/g,
                `$1value="${userData.name}"`
            );
        }
        
        if (userData.agentId) {
            printableContent = printableContent.replace(
                /(<input[^>]*id="userInfoAgentIdInput"[^>]*value=")[^"]*(")/g,
                `$1${userData.agentId}$2`
            );
            printableContent = printableContent.replace(
                /(<input[^>]*id="userInfoAgentIdInput"[^>]*)(placeholder="[^"]*")/g,
                `$1value="${userData.agentId}"`
            );
        }

        // Correction post-traitement pour améliorer l'affichage
        console.log("[Impression V26] HTML ORIGINAL:", printableContent.substring(printableContent.indexOf('weekStartDateDisplay') - 50, printableContent.indexOf('weekStartDateDisplay') + 200));
        
        // Correction de l'espacement des dates
        printableContent = printableContent.replace(
            /(<span id="weekStartDateDisplay"[^>]*>[^<]+<\/span>)\s*(?:"|&quot;)?\s*au\s*(?:"|&quot;)?\s*(<span id="weekEndDateDisplay")/g, 
            '$1 au $2'
        );
        
        // Alternative avec &nbsp;
        printableContent = printableContent.replace(
            /(<span id="weekStartDateDisplay"[^>]*>[^<]+<\/span>)\s*au\s*(<span id="weekEndDateDisplay")/g, 
            '$1&nbsp;au&nbsp;$2'
        );
        
        // Nettoyage des guillemets orphelins
        printableContent = printableContent.replace(/"\s*au\s*"/g, ' au ');
        printableContent = printableContent.replace(/&quot;\s*au\s*&quot;/g, ' au ');
        
        // Modifier la cellule SEMAINE pour un meilleur positionnement
        printableContent = printableContent.replace(
            /<th rowspan="2" class="day-col">SEMAINE<\/th>/g,
            '<th rowspan="2" class="day-col print-semaine-cell">SEMAINE</th>'
        );

        console.log("[Impression V26] HTML CORRIGÉ:", printableContent.substring(printableContent.indexOf('weekStartDateDisplay') - 50, printableContent.indexOf('weekStartDateDisplay') + 200));

        // Document HTML complet avec CORRECTION DES TRAITS + DONNÉES UTILISATEUR
        const fullDocument = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Fiche Horaire</title>
    <style>
        /* Styles de base pour l'impression - COMPATIBLES avec styles.css */
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 9pt;
            color: #34495e;
            background: white;
            margin: 0;
            padding: 15px;
        }
        
        /* En-tête - CORRECTION: Suppression du trait en bas */
        .timesheet-header {
            display: block;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: none !important; /* SUPPRIMÉ LE TRAIT */
            font-size: 8pt;
        }
        
        .user-info div {
            margin-bottom: 4px;
            display: flex;
            align-items: baseline;
        }
        
        .user-info strong {
            margin-right: 5px;
            white-space: nowrap;
        }
        
        .user-info-input {
            border: none !important;
            padding: 1px 0;
            font-size: 1em;
            background-color: transparent !important;
            width: auto;
            min-width: 100px;
            color: #34495e;
        }
        
        .user-info-input.name-input {
            min-width: 200px;
        }
        
        .user-info-input.agent-id-input {
            min-width: 80px;
        }
        
        /* Week-info - Position corrigée selon le CSS original */
        .week-info {
            text-align: left;
            margin-top: 32px;
            padding-left: 91px; /* 80px + 3px + 8px selon le CSS original */
        }
        
        .week-info div {
            margin-bottom: 2px;
        }
        
        /* Table wrapper */
        .table-wrapper {
            border: none !important;
            margin-top: 8px;
            margin-bottom: 16px;
        }
        
        /* Tableau - REPREND EXACTEMENT les styles du CSS original */
        #timesheetTable {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #777 !important;
            font-size: 8pt !important;
        }
        
        #timesheetTable th,
        #timesheetTable td {
            border-left: 1px solid #777 !important;
            border-right: 1px solid #777 !important;
            border-top: none !important;
            border-bottom: none !important;
            padding: 1px !important;
            text-align: center;
            vertical-align: middle;
            height: 18px;
        }
        
        /* Bordures spéciales pour en-têtes et pied */
        #timesheetTable thead tr th,
        #timesheetTable tfoot tr td {
            border-top: 1px solid #777 !important;
            border-bottom: 1px solid #777 !important;
        }
        
        #timesheetTable thead tr:first-child th {
            border-top: 1px solid #777 !important;
        }
        
        #timesheetTable tbody tr td:nth-child(16) {
            border-top: 1px solid #777 !important;
            border-bottom: 1px solid #777 !important;
        }
        
        /* En-têtes colorés */
        #timesheetTable thead th {
            background-color: #D0D0E8;
            font-weight: bold;
        }
        
        #timesheetTable thead th.sub-header-time {
            font-size: 7pt;
            font-weight: normal;
            width: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            background-color: #D0D0E8;
        }
        
        #timesheetTable thead th#headerPrevWeekCumulCellContainer {
            background-color: white;
            padding: 1px !important;
        }
        
        #timesheetTable thead tr:nth-child(2) th:last-child {
            background-color: white;
        }
        
        #timesheetTable thead th.header-obs {
            text-align: center !important;
            vertical-align: middle !important;
        }
        
        #timesheetTable thead th.leave-col,
        #timesheetTable thead th.absence-col {
            background-color: #D0D0E8 !important;
        }
        
        /* Colonne jours - Style original + correction position */
        .day-col {
            width: 70px !important;
            text-align: left !important;
            font-weight: bold;
            background-color: #D0D0E8 !important;
            padding-left: 3px !important;
        }
        
        /* Correction spéciale pour la cellule SEMAINE en impression */
        .print-semaine-cell {
            width: 70px !important;
            text-align: left !important;
            font-weight: bold;
            background-color: #D0D0E8 !important;
            padding-left: 8px !important;
            padding-top: 6px !important;
            vertical-align: top !important;
        }
        
        /* Cellules de temps */
        .time-cell,
        .sub-header-time {
            width: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 8pt;
            padding: 1px !important;
        }
        
        td.time-cell-single {
            min-width: 45px;
            width: 45px;
            font-weight: bold;
        }
        
        /* Cellules colorées - EXACTEMENT comme dans le CSS original */
        #timesheetTable tbody tr td:nth-child(6),
        #timesheetTable tbody tr td:nth-child(7),
        #timesheetTable tbody tr td:nth-child(12),
        #timesheetTable tbody tr td:nth-child(13) {
            background-color: #FFFFC0 !important;
        }
        
        #timesheetTable tbody tr td:nth-child(14),
        #timesheetTable tbody tr td:nth-child(15) {
            background-color: #B0E0E6 !important;
        }
        
        #timesheetTable tbody tr td:nth-child(16) {
            background-color: white !important;
        }
        
        /* Groupage des colonnes hh/mm - EXACTEMENT comme dans le CSS original */
        #timesheetTable td:nth-child(2),
        #timesheetTable thead tr:nth-child(2) th:nth-child(1),
        #timesheetTable td:nth-child(4),
        #timesheetTable thead tr:nth-child(2) th:nth-child(3),
        #timesheetTable td:nth-child(6),
        #timesheetTable thead tr:nth-child(2) th:nth-child(5),
        #timesheetTable td:nth-child(8),
        #timesheetTable thead tr:nth-child(2) th:nth-child(7),
        #timesheetTable td:nth-child(10),
        #timesheetTable thead tr:nth-child(2) th:nth-child(9),
        #timesheetTable td:nth-child(12),
        #timesheetTable thead tr:nth-child(2) th:nth-child(11),
        #timesheetTable td:nth-child(14),
        #timesheetTable thead tr:nth-child(2) th:nth-child(13) {
            border-right-style: none !important;
            padding-right: 1px !important;
        }
        
        #timesheetTable td:nth-child(3),
        #timesheetTable thead tr:nth-child(2) th:nth-child(2),
        #timesheetTable td:nth-child(5),
        #timesheetTable thead tr:nth-child(2) th:nth-child(4),
        #timesheetTable td:nth-child(7),
        #timesheetTable thead tr:nth-child(2) th:nth-child(6),
        #timesheetTable td:nth-child(9),
        #timesheetTable thead tr:nth-child(2) th:nth-child(8),
        #timesheetTable td:nth-child(11),
        #timesheetTable thead tr:nth-child(2) th:nth-child(10),
        #timesheetTable td:nth-child(13),
        #timesheetTable thead tr:nth-child(2) th:nth-child(12),
        #timesheetTable td:nth-child(15),
        #timesheetTable thead tr:nth-child(2) th:nth-child(14) {
            border-left-style: none !important;
            padding-left: 1px !important;
        }
        
        /* Colonnes spéciales */
        .leave-col,
        .absence-col {
            background-color: white !important;
            width: 70px !important;
            min-width: 70px !important;
        }
        
        .obs-col {
            width: 120px !important;
            text-align: left !important;
            padding: 0 !important;
        }
        
        /* Champs de saisie */
        .editable-cell-input {
            width: 95%;
            height: 16px;
            line-height: 16px;
            border: none;
            background-color: transparent;
            text-align: center;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 8pt;
            padding: 0;
            margin: 0 auto;
            box-sizing: border-box;
        }
        
        .prev-cumul-input {
            width: calc(100% - 2px) !important;
            height: calc(100% - 2px) !important;
            text-align: center !important;
            border: 1px solid #ccc !important;
            padding: 0 !important;
            font-size: 8pt !important;
            box-sizing: border-box;
            margin: 0;
            vertical-align: middle;
        }
        
        .obs-input {
            width: 100%;
            height: 100%;
            min-height: 16px;
            border: none;
            background-color: transparent;
            text-align: left;
            font-family: inherit;
            font-size: inherit;
            padding: 1px 2px;
            box-sizing: border-box;
        }
        
        /* Pied du tableau */
        .detailed-timesheet .leave-col,
        .detailed-timesheet .absence-col {
            background-color: white !important;
        }
        
        .detailed-timesheet tfoot tr {
            background-color: white;
        }
        
        .detailed-timesheet tfoot tr.total-row td {
            font-weight: bold;
            color: #2c3e50;
            height: 20px;
            background-color: white !important;
        }
        
        .detailed-timesheet tfoot tr.total-row td.label-cell {
            text-align: right !important;
            padding-right: 10px !important;
            font-weight: bold;
            border-right: 1px solid #777 !important;
        }
        
        .detailed-timesheet tfoot tr.total-row #weekTotalNetCumul {
            background-color: white !important;
            color: #2c3e50;
            text-align: center !important;
            border-left: 1px solid #777 !important;
            border-right: 1px solid #777 !important;
        }
        
        .detailed-timesheet tfoot tr.total-row td:last-child {
            border-left: 1px solid #777 !important;
        }
        
        /* Pied de page - CORRECTION: Suppression du trait en haut */
        .timesheet-footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: none !important; /* SUPPRIMÉ LE TRAIT */
            font-size: 8pt;
        }
        
        .timesheet-footer .signature-area {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding-top: 0;
            border-top: none !important;
        }
        
        .timesheet-footer .signature-block {
            width: 100%;
            display: flex;
            align-items: baseline;
            border: none !important;
        }
        
        .timesheet-footer .signature-date-label {
            font-weight: bold;
            white-space: nowrap;
            margin: 0;
            padding: 0;
            min-width: 180px;
            flex-shrink: 0;
            border: none !important;
        }
        
        .timesheet-footer .signature-date-label .signature-actual-date {
            font-weight: normal;
            margin-left: 4px;
            border: none !important;
        }
        
        .timesheet-footer .signature-text-label {
            text-align: left;
            border: none !important;
            padding: 0;
            margin: 0;
            min-height: 12px;
            margin-left: 16px;
        }
    </style>
</head>
<body>
    ${printableContent}
    <script>
        // NOUVEAU V26: Script pour finaliser les données utilisateur après chargement
        document.addEventListener('DOMContentLoaded', function() {
            console.log("[Impression V26] Finalisation données utilisateur...");
            
            // Assurer que les valeurs sont visibles même si les inputs sont dynamiques
            const nameInput = document.getElementById('userInfoNameInput');
            const agentIdInput = document.getElementById('userInfoAgentIdInput');
            
            if (nameInput && '${userData.name}') {
                nameInput.value = '${userData.name}';
                nameInput.style.display = 'inline';
                console.log("[Impression V26] Nom appliqué: ${userData.name}");
            }
            
            if (agentIdInput && '${userData.agentId}') {
                agentIdInput.value = '${userData.agentId}';
                agentIdInput.style.display = 'inline';
                console.log("[Impression V26] N° Agent appliqué: ${userData.agentId}");
            }
        });
    </script>
</body>
</html>`;

        console.log("[Impression V26] Document créé avec données utilisateur, lancement impression");
        
        // Écrire le document et imprimer
        printWindow.document.write(fullDocument);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            setTimeout(() => {
                printWindow.close();
                if (typeof AppUtils !== 'undefined' && AppUtils.showToast) {
                    AppUtils.showToast("Impression terminée avec données utilisateur.", "success");
                }
            }, 2000);
        }, 1000);
    }

    function initPrintModule() {
        console.log("[Impression V26] Initialisation");
        const printButton = document.getElementById(PRINT_BUTTON_ID);

        if (printButton) {
            printButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log("[Impression V26] Bouton cliqué");
                handleOptimizedPrint();
            });
            
            console.log("[Impression V26] Event listener attaché");
        } else {
            console.warn("[Impression V26] Bouton non trouvé");
        }
    }

    // Initialisation avec délai
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initPrintModule, 2000);
        });
    } else {
        setTimeout(initPrintModule, 2000);
    }

})();