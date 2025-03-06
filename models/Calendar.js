module.exports = (sequelize, DataTypes) => {
    const Calendar = sequelize.define('Calendar', {
        date: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: true,
                isDateOnly(value) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        throw new Error('Date must be in YYYY-MM-DD format.');
                    }
                },
            },
        },
        event_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true, // Ensures the column is not empty
            },
        },
        description: {
            type: DataTypes.TEXT, // Use TEXT for longer descriptions
            allowNull: true, // Allow null if description is optional
        },
        event_photo: {
            type: DataTypes.STRING, // Store the URL or file path of the event photo
            allowNull: true, // Allow null if photo is optional
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW, // Automatically set to the current timestamp
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true, // Allow null if not updated
        },
    }, {
        tableName: 'Calendar', // Optional: Specify the table name
        timestamps: true, // Automatically add createdAt and updatedAt timestamps
    });

    return Calendar;
};