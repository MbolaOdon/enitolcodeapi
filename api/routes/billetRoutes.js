const express = require('express');
const router = express.Router();
const {
  getAllBillets,
  getBilletById,
  createBillet,
  updateBillet,
  deleteBillet,

} = require('../controllers/billetController');

const {getTicketStats} = require('../controllers/statistiqueController');

const {generateQRCode,
  validateQRCode,
  generateAndSendQRcodes,generateQRCodeForAllPaidStudents} = require('../controllers/qrcodeController');

const { authenticateToken } = require('../middleware/auth');

router.get('/count-invalide',getTicketStats);

/**
 * @route   GET /api/billets
 * @desc    Obtenir tous les billets avec pagination et filtres
 * @query   page - Numéro de page (défaut: 1)
 * @query   limit - Nombre d'éléments par page (défaut: 10)
 * @query   etudiant_id - Filtrer par ID étudiant
 * @query   valide - Filtrer par statut de validité (true/false)
 * @returns {Object} - { total, page, totalPages, data }
 * @access  Public
 */
router.get('/', getAllBillets);

/**
 * @route   GET /api/billets/:id
 * @desc    Obtenir un billet par ID avec les infos de l'étudiant
 * @param   {string} id - ID du billet
 * @returns {Object} Billet avec données étudiant
 * @access  Public
 */
router.get('/:id', getBilletById);

/**
 * @route   POST /api/billets
 * @desc    Créer un nouveau billet
 * @body    {integer} etudiant_id - ID de l'étudiant (requis)
 * @body    {string} ticket_code - Code du ticket (requis)
 * @body    {date} [date_achat] - Date d'achat (défaut: maintenant)
 * @body    {boolean} [is_valide] - Statut de validité (défaut: true)
 * @body    {string} [evenement] - Nom de l'événement
 * @returns {Object} Billet créé
 * @access  Public
 */
router.post('/', createBillet);

/**
 * @route   PUT /api/billets/:id
 * @desc    Mettre à jour complètement un billet
 * @param   {string} id - ID du billet
 * @body    {integer} [etudiant_id] - Nouvel ID étudiant
 * @body    {string} [ticket_code] - Nouveau code ticket
 * @body    {date} [date_achat] - Nouvelle date d'achat
 * @body    {boolean} [is_valide] - Nouveau statut de validité
 * @body    {string} [evenement] - Nouveau nom d'événement
 * @returns {Object} Billet mis à jour
 * @access  Public
 */
router.put('/:id', updateBillet);

/**
 * @route   DELETE /api/billets/:id
 * @desc    Supprimer définitivement un billet
 * @param   {string} id - ID du billet
 * @returns 204 No Content
 * @access  Public
 */
router.delete('/:id', deleteBillet);
router.post('/generate', generateQRCode);
router.post('/validate', validateQRCode);
router.post('/send-all', generateAndSendQRcodes);
router.post('/generate-all', generateQRCodeForAllPaidStudents);




module.exports = router;