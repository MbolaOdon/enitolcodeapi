const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');

const auth = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    // Vérifier le token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Trouver l'utilisateur
    const user = await User.findOne({
      where: { id: decoded.id, isActive: true }
    });

    if (!user) {
      throw new Error();
    }

    // Ajouter l'utilisateur et le token à la requête
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentification requise' });
  }
};

module.exports = auth;