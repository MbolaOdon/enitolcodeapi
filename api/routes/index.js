const express = require('express');
const router = express.Router();

// Import des routes
const userRoutes = require('./userRoutes');
const etudiantRoutes = require('./etudiantRoutes');
const billetRoutes = require('./billetRoutes');
const authRoutes = require('./authRoutes');
const statistiqueRoutes = require('./statistiqueRoutes');


// Route de base pour vérifier que l'API fonctionne
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Express.js avec Sequelize et PostgreSQL',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      posts: '/api/etudiants'
    }
  });
});

// Routes pour les utilisateurs
router.use('/users', userRoutes);
router.use('/etudiants', etudiantRoutes);
router.use('/billets', billetRoutes);
router.use('/auth', authRoutes);
router.use('/stats', statistiqueRoutes)

// Routes pour les posts


module.exports = router;