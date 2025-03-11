module.exports = (sequelize, DataTypes) => {
    const VerificationCodes = sequelize.define('VerificationCodes', {
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      tableName: 'VerificationCodes',
      timestamps: false,
    });
  
    return VerificationCodes;
  };