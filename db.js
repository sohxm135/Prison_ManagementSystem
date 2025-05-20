const oracledb = require('oracledb');
const dotenv = require('dotenv');
dotenv.config();

async function getConnection() {
    return await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECTION_STRING,
    });
}

module.exports = getConnection;
