'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Etudiants extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Etudiants.hasMany(models.Billets, {
        foreignKey: 'etudiant_id',
        onDelete: 'CASCADE',
        as: 'billets' 
      });
    }
  }
  Etudiants.init({
    matricule: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    niveau: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    has_payed:{
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Etudiants',
  });
  return Etudiants;
};