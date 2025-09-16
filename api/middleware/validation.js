// Middleware de validation pour les paramètres d'ID
const validateId = (req, res, next) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide. L\'ID doit être un nombre entier positif.'
      });
    }
    
    req.params.id = id;
    next();
  };
  
  // Middleware de validation pour la création d'utilisateur
  const validateUserCreation = (req, res, next) => {
    const { firstName, lastName, email } = req.body;
    const errors = [];
  
    if (!firstName || firstName.trim().length < 2) {
      errors.push('Le prénom est requis et doit contenir au moins 2 caractères');
    }
  
    if (!lastName || lastName.trim().length < 2) {
      errors.push('Le nom est requis et doit contenir au moins 2 caractères');
    }
  
    if (!email) {
      errors.push('L\'email est requis');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Format d\'email invalide');
      }
    }
  
    if (req.body.age !== undefined) {
      const age = parseInt(req.body.age);
      if (isNaN(age) || age < 0 || age > 120) {
        errors.push('L\'âge doit être un nombre entre 0 et 120');
      }
    }
  
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Données de validation invalides',
        errors
      });
    }
  
    next();
  };
  
  // Middleware de validation pour la création de post
  const validatePostCreation = (req, res, next) => {
    const { title, content, userId } = req.body;
    const errors = [];
  
    if (!title || title.trim().length < 5) {
      errors.push('Le titre est requis et doit contenir au moins 5 caractères');
    }
  
    if (!content || content.trim().length < 10) {
      errors.push('Le contenu est requis et doit contenir au moins 10 caractères');
    }
  
    if (!userId) {
      errors.push('L\'ID de l\'utilisateur est requis');
    } else {
      const userIdInt = parseInt(userId);
      if (isNaN(userIdInt) || userIdInt <= 0) {
        errors.push('L\'ID de l\'utilisateur doit être un nombre entier positif');
      }
    }
  
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Données de validation invalides',
        errors
      });
    }
  
    next();
  };
  
  // Middleware de validation pour la pagination
  const validatePagination = (req, res, next) => {
    if (req.query.page) {
      const page = parseInt(req.query.page);
      if (isNaN(page) || page < 1) {
        return res.status(400).json({
          success: false,
          message: 'Le paramètre page doit être un nombre entier positif'
        });
      }
    }
  
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Le paramètre limit doit être un nombre entre 1 et 100'
        });
      }
    }
  
    next();
  };
  
  module.exports = {
    validateId,
    validateUserCreation,
    validatePostCreation,
    validatePagination
  };