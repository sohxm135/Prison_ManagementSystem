const oracledb = require('oracledb');

async function connectToOracle() {
  try {
    // Optional: enable Promises
    oracledb.initOracleClient(); // Optional if using Instant Client already in system path

    const connection = await oracledb.getConnection({
      user: "c##adi",
      password: "adi137",
      connectString: "localhost:1521/XE"  // e.g. "localhost:1521/XEPDB1"
    });

    console.log("Successfully connected to Oracle!");

    // Test query
    const result = await connection.execute(`SELECT * FROM pms`);
    console.log(result.rows);

    // Always close the connection
    await connection.close();
  } catch (err) {
    console.error("Error connecting to Oracle:", err);
  }
}

connectToOracle();
