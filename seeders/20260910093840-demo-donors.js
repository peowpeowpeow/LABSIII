
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Donors', [
      {
        fullName: 'Иванов Иван Иванович',
        bloodType: 'A+',
        phone: '+375291234567',
        email: 'ivanov@mail.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        fullName: 'Петрова Анна Сергеевна',
        bloodType: 'B-',
        phone: '+375295678901',
        email: 'petrova@mail.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Donors', null, {});
  }
};

