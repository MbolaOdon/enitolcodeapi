module.exports = {
    apps: [
      {
        name: 'api-express',
        script: 'server.js', // Remplace par le point d’entrée de ton app
        instances: 'max',     // Lancement en mode cluster avec tous les cœurs
        exec_mode: 'cluster', // Nécessaire pour le mode cluster
        env: {
          NODE_ENV: 'development',
          PORT: 3000
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 80
        },
        watch: false,         // Active `true` si tu veux recharger automatiquement (utile en dev)
        autorestart: true,
        max_memory_restart: '300M' // Redémarre l’app si elle dépasse 300 Mo de RAM
      }
    ]
  };
  