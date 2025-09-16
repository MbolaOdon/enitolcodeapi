const xlsx = require('xlsx');
const { Etudiants, sequelize } = require('../models');

// Fonction utilitaire pour créer un email étudiant
const generateStudentEmail = (nom, prenom) => {
    const cleanNom = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanPrenom = prenom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `${cleanNom}.${cleanPrenom.replace(/\s+/g, '.')}@univ-tol.mg`;
};

// Fonction utilitaire pour séparer nom et prénom
const splitFullName = (fullName) => {
    const nameParts = fullName.trim().split(/\s+/);
    return {
        nom: nameParts[0],
        prenom: nameParts.slice(1).join(' ') || 'Non spécifié'
    };
};

/**
 * Importe des étudiants à partir d'un fichier Excel
 * @param {string} filePath - Chemin vers le fichier Excel
 * @returns {Promise<Object>} - Résultat de l'importation
 */
const importStudentsFromExcel = async (filePath) => {
    const transaction = await sequelize.transaction();
    try {
        const workbook = xlsx.readFile(filePath);
        const insertedStudents = [];
        const errors = [];

        // Parcourir chaque feuille du fichier Excel
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet);

            // Déterminer le niveau en fonction du nom de la feuille
            let niveau = '';
            if (sheetName.includes('L1')) niveau = 'L1';
            else if (sheetName.includes('L2')) niveau = 'L2';
            else if (sheetName.includes('L3')) niveau = 'L3';
            else if (sheetName.includes('M1')) niveau = 'M1';
            else if (sheetName.includes('M2')) niveau = 'M2';

            // Parcourir les données de la feuille
            for (const [index, row] of data.entries()) {
                try {
                    // Vérifier si la ligne contient des données d'étudiant
                    if (!row['N ° MATICULE'] || !row['Nom et prenom']) {
                        errors.push({
                            row: index + 2,
                            error: 'Données manquantes',
                            details: 'Matricule ou nom manquant'
                        });
                        continue;
                    }

                    const matricule = row['N ° MATICULE'].toString().trim();
                    const { nom, prenom } = splitFullName(row['Nom et prenom'].toString());

                    // Validation des champs obligatoires
                    if (!matricule || !nom || !prenom || !niveau) {
                        errors.push({
                            row: index + 2,
                            error: 'Données incomplètes',
                            details: { matricule, nom, prenom, niveau }
                        });
                        continue;
                    }

                    // Créer un email basé sur le nom et prénom
                    const email = generateStudentEmail(nom, prenom);

                    // Vérifier si l'étudiant existe déjà
                    const existingStudent = await Etudiants.findOne({ 
                        where: { matricule },
                        transaction
                    });
                    
                    if (existingStudent) {
                        errors.push({
                            row: index + 2,
                            error: 'Étudiant existe déjà',
                            details: { matricule }
                        });
                        continue;
                    }

                    // Créer un nouvel étudiant
                    const newStudent = await Etudiants.create({
                        matricule,
                        nom,
                        prenom,
                        niveau,
                        email,
                        has_payed: false
                    }, { transaction });

                    insertedStudents.push({
                        matricule: newStudent.matricule,
                        nom: newStudent.nom,
                        prenom: newStudent.prenom,
                        niveau: newStudent.niveau,
                        email: newStudent.email
                    });

                } catch (error) {
                    errors.push({
                        row: index + 2,
                        error: 'Erreur lors du traitement',
                        details: error.message
                    });
                }
            }
        }

        await transaction.commit();
        
        return {
            success: true,
            message: 'Importation terminée',
            summary: {
                totalProcessed: insertedStudents.length + errors.length,
                successCount: insertedStudents.length,
                errorCount: errors.length
            },
            insertedStudents,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        await transaction.rollback();
        console.error('Erreur lors de l\'importation:', error);
        
        return {
            success: false,
            error: 'Erreur serveur lors de l\'importation',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
    }
};

module.exports = {
    importStudentsFromExcel,
    generateStudentEmail,
    splitFullName
};