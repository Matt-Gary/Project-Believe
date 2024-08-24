module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define('Users', {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true // Ensures the column is not empty
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true // Ensures the column contains a valid email format
        }
      },
      matricula: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
          notEmpty: true
        }
      }
    }, {
      tableName: 'Users', // Optional: Specify the table name
      timestamps: true // Optional: Add createdAt and updatedAt timestamps
    });
  
    return Users;
  };