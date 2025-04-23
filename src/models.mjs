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
        count_views: {
            type: DataTypes.BIGINT,
            defaultValue: 0,
        },
    }, {
        tableName: 'links',
    })
}
