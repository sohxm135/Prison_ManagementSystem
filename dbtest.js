require('dotenv').config();
const oracledb = require('oracledb');

async function testConnection() {
    try {
        console.log("DB_USER:", process.env.DB_USER);
        console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
        console.log("DB_CONNECTION_STRING:", process.env.DB_CONNECTION_STRING);

        const conn = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECTION_STRING,
        });

        console.log("✅ Successfully connected to Oracle!");
        await conn.close();
    } catch (err) {
        console.error("❌ Oracle DB connection failed:", err);
    }
}

testConnection();
