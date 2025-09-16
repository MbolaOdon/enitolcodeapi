'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Méthode pour vérifier le mot de passe
     */
    validPassword(password) {
      return bcrypt.compareSync(password, this.password);
    }

    /**
     * Méthode pour générer un JWT
     */
    generateAuthToken() {
      return jwt.sign(
        { id: this.id, email: this.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
    }

    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      // Définir les associations ici si nécessaire
    }
  }

  User.init({
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING, // Correction: STRING au lieu de STRING
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    niveau: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 128],
        is: /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/ // Au moins 1 maj, 1 min, 1 chiffre
      },
      set(value) {
        const hash = bcrypt.hashSync(value, 10);
        this.setDataValue('password', hash);
      }
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'User',
    paranoid: true, // Pour le soft delete
    defaultScope: {
      attributes: { exclude: ['password', 'deletedAt'] }
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] }
      }
    },
    hooks: {
      beforeCreate: (user) => {
        if (user.email) {
          user.email = user.email.toLowerCase();
        }
      }
    }
  });

  // Méthode toJSON pour ne pas retourner le mot de passe
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.deletedAt;
    return values;
  };

  return User;
};