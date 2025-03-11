module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define('Users', {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isEmail: true,
      },
    },
    matricula: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    profilePhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: {
          args: /^[0-9]{13}$/,
          msg: 'O número de telefone deve ter 11 dígitos, sem espaços ou caracteres especiais.',
        },
      },
    },
    resetPasswordCode: {
      type: DataTypes.STRING,
    },
    resetPasswordExpiresAt: {
      type: DataTypes.DATE,
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'USER'),
      allowNull: false,
      defaultValue: 'USER',
    },
    typeOfPlan: {
      type: DataTypes.ENUM('mensal', 'trimestral', 'semestral', 'anual'),
      allowNull: false,
      defaultValue: 'mensal', // Plano padrão
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW, // Data de início padrão é a data atual
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true, // Será calculado com base no tipo de plano e data de início
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
    tableName: 'Users',
    timestamps: false,
  });

  return Users;
};