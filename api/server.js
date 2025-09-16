require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import des modules locaux
const { sequelize } = require('./models');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');


const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// GESTION GLOBALE DES ERREURS NON CAPTURÉES
// ============================================

// Capture des exceptions non gérées
process.on('uncaughtException', (error) => {
  console.error('❌ EXCEPTION NON CAPTURÉE:', error);
  console.error('Stack trace:', error.stack);
  
  // Log l'erreur dans un système de monitoring en production
  if (process.env.NODE_ENV === 'production') {
    // Envoyer à un service de monitoring (Sentry, LogRocket, etc.)
    console.error('Erreur critique en production:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  // Ne pas arrêter le processus, juste logger
  console.log('🔄 Le serveur continue de fonctionner...');
});

// Capture des promesses rejetées non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ PROMESSE REJETÉE NON GÉRÉE:', reason);
  console.error('À la promesse:', promise);
  
  if (process.env.NODE_ENV === 'production') {
    console.error('Promesse rejetée en production:', {
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }
  
  // Ne pas arrêter le processus
  console.log('🔄 Le serveur continue de fonctionner...');
});

// Configuration du rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // maximum 100 requêtes par fenêtre de temps
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://votre-domaine.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(limiter);

// Middlewares de parsing avec gestion d'erreurs
app.use(express.json({ 
  limit: '10mb',
  // Gestion des erreurs de parsing JSON
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (error) {
      console.error('❌ Erreur de parsing JSON:', error.message);
      const err = new Error('JSON invalide');
      err.status = 400;
      throw err;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging en développement avec gestion d'erreurs
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    try {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    } catch (error) {
      console.error('❌ Erreur dans le middleware de logging:', error);
      next(); // Continue sans arrêter le processus
    }
  });
}


// =======================================
// MIDDLEWARE DE GESTION D'ERREURS ASYNC
// =======================================
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes principales avec wrapper de gestion d'erreurs
app.use('/api', (req, res, next) => {
  try {
    routes(req, res, next);
  } catch (error) {
    console.error('❌ Erreur dans les routes:', error);
    next(error);
  }
});

// Route de health check robuste
app.get('/health', asyncHandler(async (req, res) => {
  let dbStatus = 'Déconnectée';
  let dbError = null;
  
  try {
    await sequelize.authenticate();
    dbStatus = 'Connectée';
  } catch (error) {
    console.error('❌ Erreur de connexion DB dans health check:', error);
    dbError = error.message;
  }
  
  const isHealthy = dbStatus === 'Connectée';
  
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? 'API en bonne santé' : 'Problème de santé de l\'API',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    ...(dbError && { error: dbError })
  });
}));

// =====================================
// MIDDLEWARE D'ERREUR AMÉLIORÉ
// =====================================
const enhancedErrorHandler = (error, req, res, next) => {
  console.error('❌ Erreur capturée par le middleware:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Ne pas exposer les détails d'erreur en production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: isDevelopment ? error.message : 'Erreur interne du serveur',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
};

// Middlewares de gestion d'erreurs (doivent être à la fin)
app.use(notFound);
app.use(enhancedErrorHandler);

// =======================================
// FONCTION DE DÉMARRAGE ROBUSTE
// =======================================
const startServer = async () => {
  let server;
  
  try {
    console.log('🚀 Démarrage du serveur...');
    
    // Test de connexion à la base de données avec retry
    let dbConnected = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!dbConnected && attempts < maxAttempts) {
      try {
        await sequelize.authenticate();
        console.log('✅ Connexion à PostgreSQL établie avec succès');
        dbConnected = true;
      } catch (error) {
        attempts++;
        console.error(`❌ Tentative ${attempts}/${maxAttempts} - Erreur de connexion DB:`, error.message);
        
        if (attempts < maxAttempts) {
          console.log(`⏳ Nouvelle tentative dans 5 secondes...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error('❌ Impossible de se connecter à la base de données après plusieurs tentatives');
          console.log('🚀 Le serveur démarre quand même (mode dégradé)');
        }
      }
    }

    // Synchronisation des modèles (uniquement en développement)
    if (process.env.NODE_ENV === 'development' && dbConnected) {
      try {
        await sequelize.sync({ alter: true });
        console.log('✅ Modèles synchronisés avec la base de données');
      } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error.message);
        console.log('🔄 Le serveur continue sans synchronisation');
      }
    }

    // Démarrage du serveur
    server = app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
      console.log(`✨ Mode anti-crash activé`);
    });

    // Gestion des erreurs du serveur
    server.on('error', (error) => {
      console.error('❌ Erreur du serveur:', error);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${PORT} est déjà utilisé`);
        process.exit(1);
      }
      
      // Pour les autres erreurs, ne pas arrêter le serveur
      console.log('🔄 Le serveur continue de fonctionner malgré l\'erreur');
    });

  } catch (error) {
    console.error('❌ Erreur critique lors du démarrage du serveur:', error.message);
    console.error('Stack trace:', error.stack);
    
    // En production, on peut essayer de redémarrer
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Tentative de redémarrage en mode dégradé...');
      setTimeout(() => {
        startServer();
      }, 10000); // Redémarrage après 10 secondes
    } else {
      process.exit(1);
    }
  }
  
  return server;
};

// =======================================
// GESTION GRACIEUSE DE L'ARRÊT
// =======================================
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Signal ${signal} reçu, arrêt gracieux du serveur...`);
  
  try {
    // Fermer la connexion à la base de données
    if (sequelize) {
      await sequelize.close();
      console.log('✅ Connexion à la base de données fermée');
    }
    
    console.log('✅ Arrêt gracieux terminé');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt gracieux:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =======================================
// MONITORING DE LA SANTÉ DU SERVEUR
// =======================================
const monitorHealth = () => {
  setInterval(async () => {
    try {
      // Vérifier la mémoire
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memUsageMB > 1000) { // Si plus de 1GB
        console.warn(`⚠️ Utilisation mémoire élevée: ${memUsageMB}MB`);
      }
      
      // Vérifier la connexion DB périodiquement
      await sequelize.authenticate();
      
    } catch (error) {
      console.error('❌ Erreur lors du monitoring:', error.message);
      // Le serveur continue de fonctionner même si le monitoring échoue
    }
  }, 300000); // Toutes les 5 minutes
};

// Démarrage du serveur et du monitoring
startServer().then(() => {
  if (process.env.NODE_ENV === 'production') {
    monitorHealth();
  }
});

// Export pour les tests
module.exports = app;