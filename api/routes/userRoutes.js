const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

/**
 * @route   GET /api/users
 * @desc    Obtenir tous les utilisateurs avec pagination et recherche
 * @query   page, limit, search
 * @access  Public
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Obtenir un utilisateur par ID
 * @access  Public
 */
router.get('/:id', getUserById);

/**
 * @route   POST /api/users
 * @desc    Créer un nouvel utilisateur
 * @body    { firstName, lastName, email, age }
 * @access  Public
 */
router.post('/', createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Mettre à jour un utilisateur
 * @body    { firstName, lastName, email, age, isActive }
 * @access  Public
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Supprimer un utilisateur (soft delete)
 * @access  Public
 */
router.delete('/:id', deleteUser);

module.exports = router;