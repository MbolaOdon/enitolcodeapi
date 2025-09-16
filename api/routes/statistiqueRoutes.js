// routes/stats.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statistiqueController');

router.get('/etudiants', statsController.getStatistiquesEtudiants);
router.get('/billets', statsController.getStatistiquesBillets);
router.get('/etudiants-billets', statsController.getEtudiantsAvecBillet);
router.get('/rapport-complet', statsController.getRapportComplet);

module.exports = router;