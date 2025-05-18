// Script d'impression optimisée - Version finale révisée V19
// Remplacer complètement le contenu du fichier js/impression.js

console.log("Module Impression Optimisée - Version finale révisée V19 chargé.");

(function() {
    const PRINT_BUTTON_ID = 'printTimesheetBtn';
    const VIEW_BUTTON_ID = 'viewTimesheetBtn'; 

    function handleOptimizedPrint() {
        console.log("[Impression V19] Lancement de l'impression optimisée");

        const originalBodyClass = document.body.className;
        const elementsToRestore = []; 

        const selectorsToHide = [
            '.section.timesheet-controls', 
            '.main-header',
            '#toast-container',
            'body > nav' 
        ];

        selectorsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                if (element) {
                    elementsToRestore.push({ element: element, originalDisplay: element.style.display });
                    element.style.display = 'none';
                }
            });
        });

        document.querySelectorAll('button, .btn, input[type="button"]').forEach(button => {
            if (button.id !== PRINT_BUTTON_ID && button.id !== VIEW_BUTTON_ID) { 
                elementsToRestore.push({ element: button, originalDisplay: button.style.display });
                button.style.display = 'none';
            }
        });

        let printStyleElement = document.getElementById('optimized-print-styles');
        if (!printStyleElement) {
            printStyleElement = document.createElement('style');
            printStyleElement.id = 'optimized-print-styles';
            document.head.appendChild(printStyleElement);
        }
        
        // Vérification minutieuse de la syntaxe CSS ici
        printStyleElement.innerHTML = `
            @media print {
                @page {
                    size: A4 landscape !important;
                    margin: 10mm !important; 
                }
                .no-print, .section.timesheet-controls, header.main-header, 
                #toast-container, body > nav, button, input[type="button"], .btn {
                    display: none !important;
                    visibility: hidden !important;
                }
                html, body {
                    background-color: white !important;
                    margin: 0 !important; padding: 0 !important;
                    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                }
                #printableTimesheetArea {
                    padding: 0 !important; margin: 0 !important;
                    border: none !important; box-shadow: none !important;
                }
                .timesheet-render-area { 
                    border: none !important; 
                    box-shadow: none !important; padding: 0 !important; 
                    margin: 0 auto !important; width: 100% !important; max-width: none !important;
                    background-color: white !important;
                }
                .timesheet-header { 
                    border-bottom: 1px solid #000 !important; 
                    margin-bottom: 5mm !important; 
                    padding-bottom: 2mm !important; 
                }
                .user-info-input {
                    color: #000 !important; border: none !important; background-color: transparent !important;
                    padding: 0 !important; box-shadow: none !important;
                    -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important;
                }
                .table-wrapper { 
                    border: none !important; 
                    margin-top: 0;
                    margin-bottom: 8mm; 
                }
                #timesheetTable, #timesheetTable th, #timesheetTable td {
                    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    border-color: #333 !important;
                }
                #timesheetTable { 
                    border: 1px solid #000 !important; 
                }
                #timesheetTable thead tr th, 
                #timesheetTable tfoot tr td {
                    border-top: 1px solid #333 !important;
                    border-bottom: 1px solid #333 !important;
                }
                #timesheetTable thead tr:first-child th {
                     border-top: 1px solid #333 !important;
                }
                #timesheetTable tbody tr td:nth-child(16) { 
                    border-bottom: 1px solid #333 !important;
                    border-top: 1px solid #333 !important; 
                }
                #timesheetTable tbody tr td:not(:nth-child(16)) {
                    border-top: none !important;
                    border-bottom: none !important;
                }
                #timesheetTable td:nth-child(2), #timesheetTable thead tr:nth-child(2) th:nth-child(1),
                #timesheetTable td:nth-child(4), #timesheetTable thead tr:nth-child(2) th:nth-child(3),
                #timesheetTable td:nth-child(6), #timesheetTable thead tr:nth-child(2) th:nth-child(5),
                #timesheetTable td:nth-child(8), #timesheetTable thead tr:nth-child(2) th:nth-child(7),
                #timesheetTable td:nth-child(10),#timesheetTable thead tr:nth-child(2) th:nth-child(9),
                #timesheetTable td:nth-child(12),#timesheetTable thead tr:nth-child(2) th:nth-child(11),
                #timesheetTable td:nth-child(14),#timesheetTable thead tr:nth-child(2) th:nth-child(13) {
                    border-right-style: none !important; padding-right: 1px !important;
                }
                #timesheetTable td:nth-child(3),  #timesheetTable thead tr:nth-child(2) th:nth-child(2),
                #timesheetTable td:nth-child(5),  #timesheetTable thead tr:nth-child(2) th:nth-child(4),
                #timesheetTable td:nth-child(7),  #timesheetTable thead tr:nth-child(2) th:nth-child(6),
                #timesheetTable td:nth-child(9),  #timesheetTable thead tr:nth-child(2) th:nth-child(8),
                #timesheetTable td:nth-child(11), #timesheetTable thead tr:nth-child(2) th:nth-child(10),
                #timesheetTable td:nth-child(13), #timesheetTable thead tr:nth-child(2) th:nth-child(12),
                #timesheetTable td:nth-child(15), #timesheetTable thead tr:nth-child(2) th:nth-child(14) {
                    border-left-style: none !important; padding-left: 1px !important;
                }
                #timesheetTable td input.editable-cell-input,
                #timesheetTable th input.prev-cumul-input {
                    border: none !important; background-color: transparent !important;
                    box-shadow: none !important; padding: 0 !important; margin: 0 !important;
                    width: 100% !important; height: 100% !important;
                    font-size: inherit !important; color: inherit !important;
                    text-align: center !important; 
                    -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important;
                }
                #timesheetTable thead th, #timesheetTable .day-col { background-color: #D0D0E8 !important; }
                #timesheetTable thead th#headerPrevWeekCumulCellContainer { background-color: white !important; } 
                #timesheetTable thead tr:nth-child(2) th:last-child { background-color: white !important; }
                #timesheetTable thead th.header-obs { text-align: center !important; }
                #timesheetTable thead th.leave-col,
                #timesheetTable thead th.absence-col { background-color: #D0D0E8 !important; }
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(6), 
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(7),
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(12),
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(13) { background-color: #FFFFC0 !important; }
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(14),
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(15) { background-color: #B0E0E6 !important; }
                table#timesheetTable.detailed-timesheet tbody tr td:nth-child(16) { background-color: white !important; }
                #timesheetTable .leave-col, #timesheetTable .absence-col { background-color: white !important; } 
                #timesheetTable tfoot tr td { background-color: white !important; }
                #timesheetTable tfoot tr.total-row #weekTotalNetCumul { background-color: white !important; color: var(--primary-color) !important; }
                .timesheet-footer { border-top: 1px solid #000 !important; margin-top: 8mm !important; padding-top: 5mm !important; font-size: 7pt !important; page-break-inside: avoid !important; }
                .timesheet-footer::before { display: none !important; }
                .timesheet-footer .signature-area { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 5mm !important; margin-top: 0 !important; }
                .timesheet-footer .signature-block { width: 100% !important; margin: 0 !important; padding: 0 !important; display: flex !important; align-items: baseline !important; border: none !important; }
                .timesheet-footer .signature-date-label { font-weight: bold !important; min-width: 40mm; flex-shrink: 0; border: none !important; }
                .timesheet-footer .signature-date-label .signature-actual-date { font-weight: normal !important; margin-left: 2mm !important; border: none !important; }
                .timesheet-footer .signature-text-label { text-align: left !important; border: none !important; padding-top:0 !important; margin:0 0 0 5mm !important; min-height: 7mm; flex-grow: 1; }
            }
        `;
        
        document.body.classList.add('printing-mode');

        setTimeout(() => {
            window.print(); 
            setTimeout(() => {
                elementsToRestore.forEach(item => {
                    item.element.style.display = item.originalDisplay;
                });
                const controlsContainer = document.querySelector('.section.timesheet-controls');
                if (controlsContainer) {
                    const originalControlsState = elementsToRestore.find(item => item.element === controlsContainer);
                    controlsContainer.style.display = originalControlsState ? originalControlsState.originalDisplay : '';
                }
                if (printStyleElement && printStyleElement.parentNode) {
                    printStyleElement.parentNode.removeChild(printStyleElement);
                }
                document.body.className = originalBodyClass;
                if (typeof showToast === 'function') {
                    showToast("Impression terminée.", "success");
                }
                console.log("[Impression V19] Restauration de l'état original terminée.");
            }, 1000); 
        }, 500); 
    }

    function initPrintModule() {
        console.log("[Impression V19] Initialisation du module d'impression.");
        const printButton = document.getElementById(PRINT_BUTTON_ID); 

        if (printButton) {
            // Attachement direct de l'événement. S'assurer qu'il n'y a pas d'autres scripts
            // qui modifient ou suppriment cet écouteur.
            printButton.addEventListener('click', function printBtnClickHandler(event) {
                event.preventDefault(); 
                console.log(`[Impression V19] Bouton '${PRINT_BUTTON_ID}' cliqué.`);
                handleOptimizedPrint();
                // Optionnel: supprimer l'écouteur après le premier clic pour éviter des problèmes de ré-attachement
                // printButton.removeEventListener('click', printBtnClickHandler); 
            });
            console.log(`[Impression V19] Événement 'click' attaché au bouton '${PRINT_BUTTON_ID}'.`);
        } else {
            console.warn(`[Impression V19] Bouton d'impression avec ID "${PRINT_BUTTON_ID}" non trouvé.`);
        }
    }
    
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPrintModule);
        } else {
            initPrintModule(); 
        }
    } catch (error) {
        console.error("[Impression V19] Erreur lors de l'initialisation du module d'impression:", error);
    }

})();