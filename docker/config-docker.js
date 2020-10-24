module.exports = {
    rethinkdb: {
        host: 'fnordcredit-rethinkdb',
        port: 28015,
        db: 'fnordcredit',
        authKey: ''
    },

    settings: {
        allowDebt: true,
        maxDebt: -150
    },

    mqtt: {
        enable: true,
        host: 'fnordcredit-mosquitto',
        port: 1883,
        prefix: 'service/fnordcredit'
    }
};
