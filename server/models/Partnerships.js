module.exports = (sequelize, DataTypes) => {
    const Partnerships = sequelize.define('Partnerships', {
      companyName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true // Ensures the company name is not empty
        }
      },
      companyEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true // Ensures the column contains a valid email format
        }
      },
      discount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          isFloat: true, // Ensures the discount is a floating point number
          min: 0 // Ensures the discount is not negative
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true, // Optional field
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Automatically set current timestamp
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
      }
    }, {
      tableName: 'Partnerships', // Optional: Specify the table name
      timestamps: false // Optional: Disable automatic `createdAt` and `updatedAt` fields if you handle them manually
    });
  
    return Partnerships;
  };