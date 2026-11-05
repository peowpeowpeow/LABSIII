'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Donor extends Model {
    static associate(models) {}
  }
  Donor.init({
    fullName: DataTypes.STRING,
    bloodType: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    registrationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Donor',
  });
  return Donor;
};