'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Vérifier d'abord si la table existe déjà
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('Users'));
    
    if (!tableExists) {
      await queryInterface.createTable('Users', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        firstName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        niveau: {
          type: Sequelize.STRING,
          allowNull: true
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false, // Toujours requis
          validate: {
            notEmpty: true // Validation supplémentaire
          },
          // Ajoutez un setter pour le hachage
          set(value) {
            const hash = bcrypt.hashSync(value, 10); // Hachage avec bcrypt
            this.setDataValue('password', hash);
          }
        },
        role:{
          type: Sequelize.STRING,
          allowNull: false,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        deletedAt: {
          type: Sequelize.DATE
        }
      });

      // Ajouter l'index sur l'email seulement si la table a été créée
      await queryInterface.addIndex('Users', ['email'], {
        unique: true,
        name: 'users_email_unique'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Optionnel : dans le down, vous pouvez choisir de ne pas supprimer la table
    // pour éviter de perdre des données accidentellement
    // await queryInterface.dropTable('users');
  }
};