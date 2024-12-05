module.exports = (sequelize, DataTypes) => {
    const Photos = sequelize.define('Photos', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      event_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Events', // This is the table name of the related model
          key: 'id', // The column name in the referenced table
        },
        onDelete: 'CASCADE', // Ensures that photos are deleted if their associated event is deleted
      },
      photo_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          isUrl: true, // Ensures the column contains a valid URL
        }
      },
      photo_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      visibility: {
        type: DataTypes.ENUM('PUBLIC', 'PRIVATE'),
        allowNull: false,
        defaultValue: 'PRIVATE',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      }
    }, {
      tableName: 'Photos',
      timestamps: true 
    });
    
    Photos.associate = (models) => {
        Photos.belongsTo(models.Events, {
          foreignKey: 'event_id',
          as: 'event',
        });
      };

    return Photos;
  };