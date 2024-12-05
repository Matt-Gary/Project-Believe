module.exports = (sequelize, DataTypes) => {
    const Events = sequelize.define('Events', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        event_date: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            notEmpty: true,
            isDate: true, // Ensures the column contains a valid date
          }
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
        tableName: 'Events',
        timestamps: true 
      });

      Events.associate = (models) => {
        Events.hasMany(models.Photos, {
          foreignKey: 'event_id',
          as: 'photos', // Alias for accessing photos from event
        });
      };
    
      return Events;
    };