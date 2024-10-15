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
        unique: true,
        validate: {
          notEmpty: true
        }
      },
      profilePhoto: {
        type: DataTypes.STRING,
        allowNull:true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false, 
        validate: {
          is: {
            args: /^[0-9]{13}$/, // Ensures the phone number follows the format 12 digits (e.g., 558599973444)
            msg: "Phone number must be 13 digits without spaces or special characters."
          }
        }
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
        defaultValue: 'USER'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notEmpty: true
        }
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
            notEmpty: false
        }
      },
    }, {
      tableName: 'Users', // Optional: Specify the table name
      timestamps: false // Optional: Add createdAt and updatedAt timestamps
    });
  
    return Users;
  };