
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Donors', 'rhFactor', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '+'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Donors', 'rhFactor');
  }
};
