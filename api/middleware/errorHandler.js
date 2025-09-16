// Middleware de gestion d'erreur 404
const notFound = (req, res, next) => {
    const error = new Error(`Ressource non trouvée - ${req.originalUrl}`);
    res.status(404);
    next(error);
  };
  
  // Middleware de gestion d'erreur global
  const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;
  
    // Erreur Sequelize - Validation
    if (err.name === 'SequelizeValidationError') {
      statusCode = 400;
      message = 'Erreur de validation';
    }
  
    // Erreur Sequelize - Contrainte unique
    if (err.name === 'SequelizeUniqueConstraintError') {
      statusCode = 400;
      message = 'Cette valeur existe déjà';
    }
  
    // Erreur Sequelize - Clé étrangère
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400;
      message = 'Référence invalide';
    }
  
    // Erreur de connexion à la base de données
    if (err.name === 'SequelizeConnectionError') {
      statusCode = 503;
      message = 'Erreur de connexion à la base de données';
    }
  
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
  
  module.exports = {
    notFound,
    errorHandler
  };