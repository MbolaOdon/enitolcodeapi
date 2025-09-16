'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Billets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      etudiant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Etudiants',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ticket_code: {
        type: Sequelize.STRING
      },
      date_achat: {
        type: Sequelize.DATE
      },
      is_valide: {
        type: Sequelize.BOOLEAN
      },
      evenement: {
        type: Sequelize.STRING
      },
      type_billet:{
        type: Sequelize.STRING
      },
      token_code:{
        type : Sequelize.STRING
      },
      is_sent:{
        type : Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Billets');
  }
};