import { DataTypes } from 'sequelize'

export function defineLink (db) {
    return db.define('Link', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: false,
        },
        link: {
            type: DataTypes.STRING(2048),
        },
        code: {
            type: DataTypes.STRING,
            unique: true,
        },
        count_views: {
            type: DataTypes.BIGINT,
            defaultValue: 0,
        },
        // Ссылка признана вредоносной — переход запрещён
        is_blocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Ссылка проходит, но с показом страницы-предупреждения
        is_suspicious: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Когда цель последний раз проверялась в Safe Browsing
        checked_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'links',
    })
}
