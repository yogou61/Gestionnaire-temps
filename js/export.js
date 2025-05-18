// app/js/export.js
console.log('Module Export (revu) chargé.');

/**
 * Exporte des données au format Excel (XLSX).
 * Nécessite la bibliothèque SheetJS (XLSX) chargée globalement.
 * @param {Array<Array<any>>} data - Un tableau de tableaux représentant les lignes et cellules.
 * @param {string} [filename="export.xlsx"] - Le nom du fichier à télécharger.
 * @param {string} [sheetName="Données"] - Le nom de la feuille dans le classeur Excel.
 */
function exportToExcel(data, filename = "export.xlsx", sheetName = "Données") {
    // Tenter d'utiliser showToast si disponible, sinon alert.
    const notify = (message, type) => {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.warn(`showToast non disponible. Message: ${message} (type: ${type})`);
            if (type === 'error' || type === 'warning') {
                alert(`[${type.toUpperCase()}] ${message}`);
            }
        }
    };

    if (typeof XLSX === 'undefined' || !XLSX.utils) { // Vérification plus complète
        const errorMsg = "Erreur: La bibliothèque d'export Excel (SheetJS/XLSX) n'est pas chargée ou est corrompue.";
        console.error(errorMsg);
        notify(errorMsg, "error");
        return;
    }

    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) { // data[0] doit être les en-têtes
        const warnMsg = "Aucune donnée à exporter ou format de données incorrect.";
        console.warn(warnMsg);
        notify(warnMsg, "warning");
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Ajustement optionnel des largeurs de colonnes
        if (data[0] && data[0].length > 0) { // S'assurer qu'il y a des en-têtes pour calculer la largeur
            const columnWidths = data[0].map((_, colIndex) => {
                let maxLength = 0;
                data.forEach(row => {
                    const cellValue = row[colIndex];
                    const cellContent = (cellValue === null || typeof cellValue === 'undefined') ? "" : String(cellValue);
                    if (cellContent.length > maxLength) {
                        maxLength = cellContent.length;
                    }
                });
                // Donner une largeur minimale (ex: pour les en-têtes courts) et une maximale
                return { wch: Math.min(Math.max(maxLength, 10), 60) }; 
            });
            ws['!cols'] = columnWidths;
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filename);

        console.log(`Fichier "${filename}" généré pour téléchargement.`);
        notify(`Exportation vers "${filename}" réussie !`, "success");

    } catch (error) {
        const errorMsg = "Une erreur est survenue lors de l'exportation Excel.";
        console.error(errorMsg, error);
        notify(errorMsg, "error");
    }
}

// app/js/export.js
// ... (fonction exportToExcel existante) ...

/**
 * Exporte un élément HTML (ou une partie) en PDF.
 * Nécessite jsPDF et html2canvas.
 * @param {string} elementId - L'ID de l'élément HTML à capturer.
 * @param {string} [filename="document.pdf"] - Nom du fichier PDF.
 * @param {string} [pdfTitle="Document"] - Titre à ajouter en haut du PDF.
 */
async function exportElementToPdf(elementId, filename = "document.pdf", pdfTitle = "Document") {
    const notify = (message, type) => { /* ... (fonction notify comme dans exportToExcel) ... */ 
        if (typeof showToast === 'function') showToast(message, type);
        else { console.warn(`showToast non disponible. Msg: ${message}`); if (type==='error'||type==='warning') alert(`[${type.toUpperCase()}] ${message}`);}
    };

    if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        const errorMsg = "Erreur: jsPDF ou html2canvas manquant pour l'export PDF.";
        console.error(errorMsg);
        notify(errorMsg, "error");
        return;
    }

    const elementToCapture = document.getElementById(elementId);
    if (!elementToCapture) {
        const errorMsg = `Erreur: Élément avec ID "${elementId}" non trouvé pour l'export PDF.`;
        console.error(errorMsg);
        notify(errorMsg, "error");
        return;
    }

    notify("Préparation de l'export PDF...", "info");

    try {
        const { jsPDF } = window.jspdf; // Accéder à l'objet jsPDF depuis window
        const pdf = new jsPDF({
            orientation: 'landscape', // ou 'portrait'
            unit: 'pt',              // ou 'mm', 'cm', 'in'
            format: 'a4'             // ou 'letter', etc.
        });

        // Sauvegarder le style original de l'élément pour le restaurer après
        const originalStyles = {
            width: elementToCapture.style.width,
            padding: elementToCapture.style.padding,
            boxShadow: elementToCapture.style.boxShadow,
            border: elementToCapture.style.border
        };
        // Appliquer des styles temporaires pour une meilleure capture si besoin
        // Par exemple, pour forcer une certaine largeur ou enlever des ombres
        // elementToCapture.style.width = '1000px'; // Exemple
        // elementToCapture.style.padding = '10px';
        // elementToCapture.style.boxShadow = 'none';
        // elementToCapture.style.border = 'none';


        const canvas = await html2canvas(elementToCapture, {
            scale: 2, // Augmenter l'échelle pour une meilleure résolution
            useCORS: true, // Si vous avez des images externes
            logging: false // Désactiver les logs de html2canvas dans la console
        });
        
        // Restaurer les styles originaux
        // for (const styleProp in originalStyles) {
        //     elementToCapture.style[styleProp] = originalStyles[styleProp];
        // }

        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculer les dimensions de l'image pour qu'elle rentre dans la page
        const margin = 40; // Marge en points
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin - 30; // Espace pour le titre

        let imgWidth = imgProps.width;
        let imgHeight = imgProps.height;
        let ratio = imgWidth / imgHeight;

        if (imgWidth > availableWidth) {
            imgWidth = availableWidth;
            imgHeight = imgWidth / ratio;
        }
        if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = imgHeight * ratio;
        }
        
        // Ajouter un titre au PDF
        pdf.setFontSize(16);
        pdf.text(pdfTitle, margin, margin + 10);

        // Ajouter l'image
        pdf.addImage(imgData, 'PNG', margin, margin + 30, imgWidth, imgHeight);
        pdf.save(filename);

        notify(`Export PDF "${filename}" réussi !`, "success");

    } catch (error) {
        const errorMsg = "Erreur lors de la génération du PDF.";
        console.error(errorMsg, error);
        notify(errorMsg, "error");
    }
}