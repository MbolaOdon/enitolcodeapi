const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getAllEtudiants,
  getEtudiantById,
  createEtudiant,
  updateEtudiant,
  deleteEtudiant
} = require('../controllers/etudiantController');

const { importStudentsFromExcel } = require('../Services/autoImportEtudiantFromXLSX');

const upload = multer({ dest: 'uploads/' });



/**
 * @route   GET /api/etudiants
 * @desc    Obtenir tous les étudiants avec pagination et recherche
 * @query   page - Numéro de page (défaut: 1)
 * @query   limit - Nombre d'éléments par page (défaut: 10)
 * @query   search - Terme de recherche (nom, prénom ou matricule)
 * @returns {Object} - { total, page, totalPages, data }
 * @access  Public
 */
router.get('/', getAllEtudiants);

/**
 * @route   GET /api/etudiants/:id
 * @desc    Obtenir un étudiant par ID avec ses billets associés
 * @param   {string} id - ID de l'étudiant
 * @returns {Object} Étudiant avec ses billets
 * @access  Public
 */
router.get('/:id', getEtudiantById);

/**
 * @route   POST /api/etudiants
 * @desc    Créer un nouvel étudiant
 * @body    {string} matricule - Matricule unique de l'étudiant
 * @body    {string} nom - Nom de l'étudiant
 * @body    {string} prenom - Prénom de l'étudiant
 * @body    {string} niveau - Niveau d'étude (ex: L1, L2, etc.)
 * @body    {boolean} has_payed
 * @returns {Object} Étudiant créé
 * @access  Public
 */
router.post('/', createEtudiant);

/**
 * @route   PUT /api/etudiants/:id
 * @desc    Mettre à jour complètement un étudiant
 * @param   {string} id - ID de l'étudiant
 * @body    {string} [matricule] - Nouveau matricule
 * @body    {string} [nom] - Nouveau nom
 * @body    {string} [prenom] - Nouveau prénom
 * @body    {string} [niveau] - Nouveau niveau
 * @returns {Object} Étudiant mis à jour
 * @access  Public
 */
router.put('/:id', updateEtudiant);

/**
 * @route   DELETE /api/etudiants/:id
 * @desc    Supprimer définitivement un étudiant et ses billets associés (CASCADE)
 * @param   {string} id - ID de l'étudiant
 * @returns 204 No Content
 * @access  Public
 */
router.delete('/:id', deleteEtudiant);

router.post('/import-etudiants', upload.single('file'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ 
              error: 'Aucun fichier téléchargé',
              details: 'Veuillez fournir un fichier Excel valide'
          });
      }

      const result = await importStudentsFromExcel(req.file.path);
      
      if (result.success) {
          res.status(200).json(result);
      } else {
          res.status(500).json(result);
      }

  } catch (error) {
      console.error('Erreur lors du traitement de la requête:', error);
      res.status(500).json({ 
          success: false,
          error: 'Erreur lors du traitement de la requête',
          details: error.message
      });
  }
});

module.exports = router;