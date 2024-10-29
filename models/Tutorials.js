module.exports = (sequelize, DataTypes) => {
    const Tutorials = sequelize.define('Tutorials', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      difficultyLevel: {
        type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
        allowNull: false,
        defaultValue: 'BEGINNER'
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
      tableName: 'Tutorials',
      timestamps: false
    });
  
    return Tutorials;
  };