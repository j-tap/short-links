import { DataTypes } from 'sequelize'

export function defineLink (db) {
    return db.define('Link', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: false,
        },
        link: {
            type: DataTypes.STRING,
        },
        code: {
            type: DataTypes.STRING,
            unique: true,
        },
    }, {
        tableName: 'links',
    })
}
