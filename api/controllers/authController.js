const { User } = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const authController = {
  // Inscription
  async register(req, res) {
    try {
      const { firstName, lastName, email, password, niveau, role } = req.body;
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }

      // Créer le nouvel utilisateur
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        niveau,
        role
      });

      // Générer le token JWT
      const token = user.generateAuthToken();

      // Retourner la réponse sans le mot de passe
      return res.status(201).json({
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Erreur inscription:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Connexion
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Trouver l'utilisateur
       // Trouver l'utilisateur avec le mot de passe
       const user = await User.scope('withPassword').findOne({ where: { email } });
       if (!user) {
         return res.status(401).json({ error: 'Identifiants invalides' });
       }
 
       // Vérifier le mot de passe
       if (!user.validPassword(password)) {
         return res.status(401).json({ error: 'Identifiants invalides' });
       }

      // Vérifier si le compte est actif
      if (!user.isActive) {
        return res.status(403).json({ error: 'Compte désactivé' });
      }

      // Générer le token JWT
      const token = user.generateAuthToken();

      return res.json({
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Récupérer le profil utilisateur
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password', 'deletedAt'] }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      return res.json(user);
    } catch (error) {
      console.error('Erreur profil:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};

module.exports = authController;