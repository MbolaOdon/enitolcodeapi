const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Inscription
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// Profil utilisateur (protégé)
router.get('/profile', auth, authController.getProfile);

module.exports = router;