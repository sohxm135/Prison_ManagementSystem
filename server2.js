require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');

const app = express();

// Middleware setup
app.use(bodyParser.json());

// Connect to Oracle Database
async function getOracleConnection() {
    return await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECTION_STRING,
    });
}

// Login authentication route
app.post('/auth', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter Username and Password!' });
    }

    try {
        const connection = await getOracleConnection();
        console.log("Connected to Oracle DB");

        // Query to fetch user details from the pms table
        const query = 'SELECT username, password FROM pms WHERE username = :username';
        const result = await connection.execute(query, [username]);

        await connection.close();

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Username!' });
        }

        const storedPassword = result.rows[0][1]; // Extract the password from the query result

        // Compare passwords (direct comparison since passwords are not hashed)
        if (password !== storedPassword) {
            return res.status(401).json({ message: 'Invalid Password!' });
        }

        // Successful login
        res.status(200).json({ message: 'Login successful!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error!' });
    }
});

// Get warden profile by ID
app.get('/api/warden/:id', async (req, res) => {
    const wardenId = req.params.id;
    // No need to convert ID to string or add W prefix - it's already in the correct format
  
    try {
      const connection = await getOracleConnection();
      console.log(`Getting warden profile for ID: ${wardenId}`);
      
      // No changes needed in query, just pass the ID as is
      const result = await connection.execute(
        `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE 
         FROM Warden
         WHERE employeeID = :id`,
        [wardenId]
      );
  
      await connection.close();
  
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const profile = {
          employeeID: row[0],
          name: row[1],
          age: row[2],
          gender: row[3],
          contact: row[4],
          salary: row[5],
          doj: row[6],
          yoe: row[7]
        };
        res.json(profile);
      } else {
        res.status(404).json({ error: 'Warden not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database Error' });
    }
});

// Profile update route
app.post('/api/profile/update', async (req, res) => {
  const { employeeId, name, age, gender, contact, salary } = req.body;

  try {
    const connection = await getOracleConnection();

    const result = await connection.execute(
      `UPDATE Warden
       SET name = :name, age = :age, gender = :gender, contact_no = :contact, salary = :salary
       WHERE employeeID = :employeeId`,
      { 
        name, 
        age: parseInt(age), 
        gender, 
        contact, 
        salary: parseFloat(salary.replace(/[$₹,]/g, '')), 
        employeeId // No conversion needed - employeeId is already in correct format
      },
      { autoCommit: true }
    );

    await connection.close();

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Password change route - Now correctly using the new ID format
app.post('/api/profile/change-password', async (req, res) => {
  const { employeeId, newPassword } = req.body;

  try {
    const connection = await getOracleConnection();
    console.log(`Updating password for employee ID: ${employeeId}`);

    // Update the password for the specified username
    // Use employeeId directly since pms table stores username in 'W001' format
    const result = await connection.execute(
      `UPDATE pms
       SET password = :newPassword
       WHERE username = :employeeId`,
      { newPassword, employeeId },
      { autoCommit: true }
    );

    await connection.close();

    if (result.rowsAffected > 0) {
      res.json({ success: true, message: 'Password updated successfully' });
    } else {
      res.json({ success: false, message: 'User not found or no changes made' });
    }
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static('public'));

// Add these API endpoints to your existing server.js file

// Get all jails
app.get('/api/jails', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT j.jailID, j.name, j.chiefJailorID, j.securityLevel, j.capacity, 
                    cj.name as chiefJailorName
             FROM Jail j
             LEFT JOIN Chief_Jailor cj ON j.chiefJailorID = cj.employeeID`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const jails = result.rows.map(row => ({
                jailID: row[0],
                name: row[1],
                chiefJailorID: row[2],
                securityLevel: row[3],
                capacity: row[4],
                chiefJailorName: row[5]
            }));
            
            res.json(jails);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching jails:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a single jail with details
app.get('/api/jails/:id', async (req, res) => {
    const jailId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        // Get jail details
        const jailResult = await connection.execute(
            `SELECT j.jailID, j.name, j.chiefJailorID, j.securityLevel, j.capacity, 
                    cj.name as chiefJailorName
             FROM Jail j
             LEFT JOIN Chief_Jailor cj ON j.chiefJailorID = cj.employeeID
             WHERE j.jailID = :jailId`,
            [jailId]
        );
        
        if (jailResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ error: 'Jail not found' });
        }
        
        // Get occupancy count (count of occupied cells in this jail)
        const occupancyResult = await connection.execute(
            `SELECT COUNT(*) 
             FROM Cell c
             JOIN Block b ON c.blockID = b.blockID
             WHERE b.jailID = :jailId AND c.isOccupied = 1`,
            [jailId]
        );
        
        await connection.close();
        
        const row = jailResult.rows[0];
        const jailDetail = {
            jailID: row[0],
            name: row[1],
            chiefJailorID: row[2],
            securityLevel: row[3],
            capacity: row[4],
            chiefJailor: {
                name: row[5]
            },
            occupancy: occupancyResult.rows[0][0]
        };
        
        res.json(jailDetail);
    } catch (err) {
        console.error('Error fetching jail details:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get blocks for a specific jail
app.get('/api/jails/:id/blocks', async (req, res) => {
    const jailId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT blockID, jailID, name, jailorID, capacity
             FROM Block
             WHERE jailID = :jailId`,
            [jailId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const blocks = result.rows.map(row => ({
                blockID: row[0],
                jailID: row[1],
                name: row[2],
                jailorID: row[3],
                capacity: row[4]
            }));
            
            res.json(blocks);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching blocks:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get cells for a specific block
app.get('/api/blocks/:id/cells', async (req, res) => {
    const blockId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT cellID, blockID, isOccupied
             FROM Cell
             WHERE blockID = :blockId`,
            [blockId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const cells = result.rows.map(row => ({
                cellID: row[0],
                blockID: row[1],
                isOccupied: row[2]
            }));
            
            res.json(cells);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching cells:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get jailor details
app.get('/api/jailors/:id', async (req, res) => {
    const jailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, YOE
             FROM Jailor
             WHERE employeeID = :jailorId`,
            [jailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const jailor = {
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact: row[4],
                yoe: row[5]
            };
            
            res.json(jailor);
        } else {
            res.status(404).json({ error: 'Jailor not found' });
        }
    } catch (err) {
        console.error('Error fetching jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add these API endpoints to your existing server.js file

// Get all wardens
app.get('/api/staff/wardens', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE
             FROM Warden`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const wardens = result.rows.map(row => ({
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7]
            }));
            
            res.json(wardens);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching wardens:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific warden
app.get('/api/staff/wardens/:id', async (req, res) => {
    const wardenId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE
             FROM Warden
             WHERE employeeID = :id`,
            [wardenId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const warden = {
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7]
            };
            
            res.json(warden);
        } else {
            res.status(404).json({ error: 'Warden not found' });
        }
    } catch (err) {
        console.error('Error fetching warden:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all chief jailors
app.get('/api/staff/chief-jailors', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE
             FROM Chief_Jailor`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const chiefJailors = result.rows.map(row => ({
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7]
            }));
            
            res.json(chiefJailors);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching chief jailors:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific chief jailor
app.get('/api/staff/chief-jailors/:id', async (req, res) => {
    const chiefJailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE
             FROM Chief_Jailor
             WHERE employeeID = :id`,
            [chiefJailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const chiefJailor = {
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7]
            };
            
            res.json(chiefJailor);
        } else {
            res.status(404).json({ error: 'Chief Jailor not found' });
        }
    } catch (err) {
        console.error('Error fetching chief jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get jails managed by a specific chief jailor
app.get('/api/staff/chief-jailors/:id/jails', async (req, res) => {
    const chiefJailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT jailID, name, securityLevel, capacity
             FROM Jail
             WHERE chiefJailorID = :id`,
            [chiefJailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const jails = result.rows.map(row => ({
                jailID: row[0],
                name: row[1],
                securityLevel: row[2],
                capacity: row[3]
            }));
            
            res.json(jails);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching jails for chief jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get jailors supervised by a specific chief jailor
app.get('/api/staff/chief-jailors/:id/jailors', async (req, res) => {
    const chiefJailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE
             FROM Jailor
             WHERE supervisorID = :id`,
            [chiefJailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const jailors = result.rows.map(row => ({
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7]
            }));
            
            res.json(jailors);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching jailors for chief jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all jailors
app.get('/api/staff/jailors', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE, supervisorID
             FROM Jailor`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const jailors = result.rows.map(row => ({
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7],
                supervisorID: row[8]
            }));
            
            res.json(jailors);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching jailors:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific jailor
app.get('/api/staff/jailors/:id', async (req, res) => {
    const jailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE, supervisorID
             FROM Jailor
             WHERE employeeID = :id`,
            [jailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const jailor = {
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7],
                supervisorID: row[8]
            };
            
            res.json(jailor);
        } else {
            res.status(404).json({ error: 'Jailor not found' });
        }
    } catch (err) {
        console.error('Error fetching jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get blocks managed by a specific jailor
app.get('/api/staff/jailors/:id/blocks', async (req, res) => {
    const jailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT b.blockID, b.name, b.jailID, b.capacity, j.name as jailName
             FROM Block b
             LEFT JOIN Jail j ON b.jailID = j.jailID
             WHERE b.jailorID = :id`,
            [jailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const blocks = result.rows.map(row => ({
                blockID: row[0],
                name: row[1],
                jailID: row[2],
                capacity: row[3],
                jailName: row[4]
            }));
            
            res.json(blocks);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching blocks for jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get guards supervised by a specific jailor
app.get('/api/staff/jailors/:id/guards', async (req, res) => {
    const jailorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE, assigned_block
             FROM Guards
             WHERE supervisorID = :id`,
            [jailorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const guards = result.rows.map(row => ({
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7],
                assigned_block: row[8]
            }));
            
            res.json(guards);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching guards for jailor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all guards
app.get('/api/staff/guards', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE, assigned_block, supervisorID
             FROM Guards`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const guards = result.rows.map(row => ({
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7],
                assigned_block: row[8],
                supervisorID: row[9]
            }));
            
            res.json(guards);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching guards:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific guard
app.get('/api/staff/guards/:id', async (req, res) => {
    const guardId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT employeeID, name, age, gender, contact_no, salary, DOJ, YOE, assigned_block, supervisorID
             FROM Guards
             WHERE employeeID = :id`,
            [guardId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const guard = {
                employeeID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                contact_no: row[4],
                salary: row[5],
                doj: row[6],
                yoe: row[7],
                assigned_block: row[8],
                supervisorID: row[9]
            };
            
            res.json(guard);
        } else {
            res.status(404).json({ error: 'Guard not found' });
        }
    } catch (err) {
        console.error('Error fetching guard:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get cells managed by a specific guard
app.get('/api/staff/guards/:id/cells', async (req, res) => {
    const guardId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        // First, get the block assigned to this guard
        const blockResult = await connection.execute(
            `SELECT assigned_block
             FROM Guards
             WHERE employeeID = :id`,
            [guardId]
        );
        
        if (blockResult.rows.length === 0) {
            await connection.close();
            return res.json([]);
        }
        
        const blockId = blockResult.rows[0][0];
        
        // Then, get all cells in that block along with prisoner info if occupied
        const result = await connection.execute(
            `SELECT c.cellID, c.blockID, c.isOccupied, p.name as prisonerName
             FROM Cell c
             LEFT JOIN Prisoner p ON c.prisonerID = p.prisonerID
             WHERE c.blockID = :blockId`,
            [blockId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const cells = result.rows.map(row => ({
                cellID: row[0],
                blockID: row[1],
                isOccupied: row[2] === 1,
                prisonerName: row[3]
            }));
            
            res.json(cells);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching cells for guard:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get block details
app.get('/api/blocks/:id', async (req, res) => {
    const blockId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT b.blockID, b.name, b.jailID, b.capacity, j.name as jailName
             FROM Block b
             LEFT JOIN Jail j ON b.jailID = j.jailID
             WHERE b.blockID = :id`,
            [blockId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const block = {
                blockID: row[0],
                name: row[1],
                jailID: row[2],
                capacity: row[3],
                jailName: row[4]
            };
            
            res.json(block);
        } else {
            res.status(404).json({ error: 'Block not found' });
        }
    } catch (err) {
        console.error('Error fetching block:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add these API endpoints to your server.js file

// Get total prisoner count
app.get('/api/dashboard/prisoners/count', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT COUNT(*) FROM Prisoner`
        );
        
        await connection.close();
        
        const count = result.rows[0][0];
        res.json({ count });
    } catch (err) {
        console.error('Error fetching prisoner count:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get jail info for dashboard (total cells, prisoner count, jail count)
app.get('/api/dashboard/jails/info', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Get total cells count
        const cellsResult = await connection.execute(
            `SELECT COUNT(*) FROM Cell`
        );
        
        // Get current prisoner count (same as in /api/dashboard/prisoners/count)
        const prisonerResult = await connection.execute(
            `SELECT COUNT(*) FROM Prisoner`
        );
        
        // Get count of jails
        const jailCountResult = await connection.execute(
            `SELECT COUNT(*) FROM Jail`
        );
        
        await connection.close();
        
        const totalCells = cellsResult.rows[0][0] || 0;
        const totalPrisoners = prisonerResult.rows[0][0] || 0;
        const jailCount = jailCountResult.rows[0][0] || 0;
        
        res.json({ 
            capacity: totalCells, 
            occupancy: totalPrisoners, 
            jailCount 
        });
    } catch (err) {
        console.error('Error fetching jail info:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get incident count - Modified to handle missing Incident table
app.get('/api/dashboard/incidents/count', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Check if Incident table exists
        const tableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'INCIDENT'`
        );
        
        let count = 0;
        
        if (tableExists.rows[0][0] > 0) {
            // Table exists, get actual count
            const result = await connection.execute(
                `SELECT COUNT(*) FROM Incident`
            );
            count = result.rows[0][0];
        } else {
            // Return 0 if table doesn't exist
            console.log('Incident table does not exist. Returning count as 0.');
        }
        
        await connection.close();
        res.json({ count });
    } catch (err) {
        console.error('Error fetching incident count:', err);
        res.status(500).json({ error: 'Database Error', count: 0 });
    }
});

// Get recent admissions (5 most recent prisoners)
app.get('/api/dashboard/prisoners/recent', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT p.prisonerID, p.name, p.age, p.crime, p.date_of_imprisonment, p.total_sentence
             FROM Prisoner p
             ORDER BY p.date_of_imprisonment DESC
             FETCH FIRST 5 ROWS ONLY`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const prisoners = result.rows.map(row => ({
                prisonerID: row[0],
                name: row[1],
                age: row[2],
                crime: row[3],
                date_of_imprisonment: row[4],
                sentence: row[5]
            }));
            
            res.json(prisoners);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching recent admissions:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all cases with prisoner and lawyer names
app.get('/api/cases', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Check if Case table exists
        const tableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'CASE'`
        );
        
        if (tableExists.rows[0][0] === 0) {
            console.log('Case table does not exist');
            await connection.close();
            return res.json([]);
        }
        
        const result = await connection.execute(
            `SELECT c.caseID, c.prisonerID, c.lawyerID, c.case_status, c.sentence_duration,
                    p.name AS prisoner_name, p.crime, l.name AS lawyer_name
             FROM "CASE" c
             LEFT JOIN Prisoner p ON c.prisonerID = p.prisonerID
             LEFT JOIN Lawyer l ON c.lawyerID = l.lawyerID
             ORDER BY c.caseID`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const cases = result.rows.map(row => ({
                caseID: row[0],
                prisonerID: row[1],
                lawyerID: row[2],
                case_status: row[3],
                sentence_duration: row[4],
                prisoner_name: row[5],
                crime: row[6],
                lawyer_name: row[7]
            }));
            
            res.json(cases);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching cases:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new case
app.post('/api/cases', async (req, res) => {
    try {
        const { caseID, prisonerID, lawyerID, case_status, sentence_duration } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if case ID already exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM "CASE" WHERE caseID = :id`,
            [caseID]
        );
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Case ID already exists' 
            });
        }
        
        console.log('Inserting new case with values:', {
            caseID, prisonerID, lawyerID, case_status, 
            sentence_duration: sentence_duration || null
        });
        
        // Insert new case - using quoted table name
        await connection.execute(
            `INSERT INTO "CASE" (caseID, prisonerID, lawyerID, case_status, sentence_duration) 
             VALUES (:caseID, :prisonerID, :lawyerID, :case_status, :sentence_duration)`,
            {
                caseID,
                prisonerID,
                lawyerID,
                case_status,
                sentence_duration: sentence_duration || null
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding case:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a case
app.delete('/api/cases/:id', async (req, res) => {
    try {
        const caseID = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if case exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM "CASE" WHERE caseID = :id`,
            [caseID]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Case not found' 
            });
        }
        
        // Delete case
        await connection.execute(
            `DELETE FROM "CASE" WHERE caseID = :id`,
            [caseID],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting case:', err);
        res.status(500).json({ success: false, message: 'Database Error' });
    }
});

// Get all prisoners (for dropdown)
app.get('/api/prisoners', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT prisonerID, name FROM Prisoner ORDER BY name`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const prisoners = result.rows.map(row => ({
                prisonerID: row[0],
                name: row[1]
            }));
            
            res.json(prisoners);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching prisoners:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all lawyers (for dropdown)
app.get('/api/lawyers', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT lawyerID, name FROM Lawyer ORDER BY name`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const lawyers = result.rows.map(row => ({
                lawyerID: row[0],
                name: row[1]
            }));
            
            res.json(lawyers);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching lawyers:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all lawyers with full details
app.get('/api/lawyers/all', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT lawyerID, name, contact_no FROM Lawyer ORDER BY lawyerID`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const lawyers = result.rows.map(row => ({
                lawyerID: row[0],
                name: row[1],
                contact_no: row[2]
            }));
            
            res.json(lawyers);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching lawyers:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific lawyer
app.get('/api/lawyers/:id', async (req, res) => {
    const lawyerId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT lawyerID, name, contact_no
             FROM Lawyer
             WHERE lawyerID = :id`,
            [lawyerId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const lawyer = {
                lawyerID: row[0],
                name: row[1],
                contact_no: row[2]
            };
            
            res.json(lawyer);
        } else {
            res.status(404).json({ error: 'Lawyer not found' });
        }
    } catch (err) {
        console.error('Error fetching lawyer:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get cases for a specific lawyer
app.get('/api/lawyers/:id/cases', async (req, res) => {
    const lawyerId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        // Check if Case table exists
        const tableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'CASE'`
        );
        
        if (tableExists.rows[0][0] === 0) {
            console.log('Case table does not exist');
            await connection.close();
            return res.json([]);
        }
        
        const result = await connection.execute(
            `SELECT c.caseID, c.prisonerID, c.case_status, c.sentence_duration,
                    p.name AS prisoner_name, p.crime
             FROM "CASE" c
             LEFT JOIN Prisoner p ON c.prisonerID = p.prisonerID
             WHERE c.lawyerID = :id
             ORDER BY c.caseID`,
            [lawyerId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const cases = result.rows.map(row => ({
                caseID: row[0],
                prisonerID: row[1],
                case_status: row[2],
                sentence_duration: row[3],
                prisoner_name: row[4],
                crime: row[5]
            }));
            
            res.json(cases);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching cases for lawyer:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new lawyer
app.post('/api/lawyers', async (req, res) => {
    try {
        const { lawyerID, name, contact_no } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if lawyer ID already exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Lawyer WHERE lawyerID = :id`,
            [lawyerID]
        );
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Lawyer ID already exists' 
            });
        }
        
        // Insert new lawyer
        await connection.execute(
            `INSERT INTO Lawyer (lawyerID, name, contact_no) 
             VALUES (:lawyerID, :name, :contact_no)`,
            {
                lawyerID,
                name,
                contact_no
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding lawyer:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Update a lawyer
app.put('/api/lawyers/:id', async (req, res) => {
    try {
        const lawyerId = req.params.id;
        const { name, contact_no } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if lawyer exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Lawyer WHERE lawyerID = :id`,
            [lawyerId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Lawyer not found' 
            });
        }
        
        // Update lawyer
        await connection.execute(
            `UPDATE Lawyer 
             SET name = :name, contact_no = :contact_no
             WHERE lawyerID = :id`,
            {
                name,
                contact_no,
                id: lawyerId
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating lawyer:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a lawyer
app.delete('/api/lawyers/:id', async (req, res) => {
    try {
        const lawyerId = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if lawyer exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Lawyer WHERE lawyerID = :id`,
            [lawyerId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Lawyer not found' 
            });
        }
        
        // Check if lawyer is associated with cases
        const caseCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM "CASE" WHERE lawyerID = :id`,
            [lawyerId]
        );
        
        if (caseCheckResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete lawyer: Lawyer is associated with active cases' 
            });
        }
        
        // Delete lawyer
        await connection.execute(
            `DELETE FROM Lawyer WHERE lawyerID = :id`,
            [lawyerId],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting lawyer:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Start server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
