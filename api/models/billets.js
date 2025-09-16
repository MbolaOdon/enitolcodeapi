'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Billets extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Billets.belongsTo(models.Etudiants, {
        foreignKey: 'etudiant_id',
        onDelete: 'CASCADE',
        as: 'etudiants' 
      });
    }
    // Dans votre modèle Billets, ajoutez cette méthode statique
    static async getTicketStats() {
      try {
        return {
          total: await this.count(),
          notValid: await this.count({ where: { is_valide: false } })
        };
      } catch (error) {
        console.error('Error getting ticket stats:', error);
        throw error;
      }
    }

  }
  Billets.init({
    etudiant_id: DataTypes.INTEGER,
    ticket_code: DataTypes.STRING,
    date_achat: DataTypes.DATE,
    is_valide: DataTypes.BOOLEAN,
    evenement: DataTypes.STRING,
    type_billet: DataTypes.STRING,
    token_code:DataTypes.STRING,
    is_sent:{ 
      type:DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Billets',
  });
  return Billets;
};