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

// Admin-specific login check
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

        // Check if user is admin and send appropriate response
        if (username === 'admin') {
            res.status(200).json({ message: 'Login successful!', role: 'admin' });
        } else {
            res.status(200).json({ message: 'Login successful!', role: 'user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error!' });
    }
});

// Add new employee to PMS table
app.post('/api/admin/employees', async (req, res) => {
    const { username, password, type } = req.body;

    if (!username || !password || !type) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const connection = await getOracleConnection();
        
        // Check if username already exists
        const checkQuery = 'SELECT COUNT(*) FROM pms WHERE username = :username';
        const checkResult = await connection.execute(checkQuery, [username]);
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }
        
        // Insert new employee
        const insertQuery = 'INSERT INTO pms (username, password, type) VALUES (:username, :password, :type)';
        await connection.execute(
            insertQuery, 
            { username, password, type },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.status(201).json({ 
            success: true, 
            message: 'Employee added successfully' 
        });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ success: false, message: 'Server Error!' });
    }
});

// Get all employees from PMS table
app.get('/api/admin/employees', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const query = 'SELECT username, password, type FROM pms ORDER BY username';
        const result = await connection.execute(query);
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const employees = result.rows.map(row => ({
                username: row[0],
                password: row[1],
                type: row[2]
            }));
            
            res.json(employees);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Database Error' });
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
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'DISCIPLINARY_ACTION'`
        );
        
        let count = 0;
        
        if (tableExists.rows[0][0] > 0) {
            // Table exists, get actual count
            const result = await connection.execute(
                `SELECT COUNT(*) FROM Disciplinary_Action`
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

// Get all call logs with prisoner names
app.get('/api/call-logs', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT cl.callLogID, cl.prisonerID, cl.receiver_name, cl.receiver_relation, 
                    cl.duration, cl.call_date, p.name AS prisoner_name
             FROM Call_Log cl
             LEFT JOIN Prisoner p ON cl.prisonerID = p.prisonerID
             ORDER BY cl.call_date DESC`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const callLogs = result.rows.map(row => ({
                callLogID: row[0],
                prisonerID: row[1],
                receiver_name: row[2],
                receiver_relation: row[3],
                duration: row[4],
                call_date: row[5],
                prisoner_name: row[6]
            }));
            
            res.json(callLogs);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching call logs:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific call log
app.get('/api/call-logs/:id', async (req, res) => {
    const callLogId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT cl.callLogID, cl.prisonerID, cl.receiver_name, cl.receiver_relation, 
                    cl.duration, cl.call_date, p.name AS prisoner_name
             FROM Call_Log cl
             LEFT JOIN Prisoner p ON cl.prisonerID = p.prisonerID
             WHERE cl.callLogID = :id`,
            [callLogId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const callLog = {
                callLogID: row[0],
                prisonerID: row[1],
                receiver_name: row[2],
                receiver_relation: row[3],
                duration: row[4],
                call_date: row[5],
                prisoner_name: row[6]
            };
            
            res.json(callLog);
        } else {
            res.status(404).json({ error: 'Call log not found' });
        }
    } catch (err) {
        console.error('Error fetching call log:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new call log
app.post('/api/call-logs', async (req, res) => {
    try {
        const { callLogID, prisonerID, receiver_name, receiver_relation, duration, call_date } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if call log ID already exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Call_Log WHERE callLogID = :id`,
            [callLogID]
        );
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Call Log ID already exists' 
            });
        }
        
        // Insert new call log
        await connection.execute(
            `INSERT INTO Call_Log (callLogID, prisonerID, receiver_name, receiver_relation, duration, call_date) 
             VALUES (:callLogID, :prisonerID, :receiver_name, :receiver_relation, :duration, TO_DATE(:call_date, 'YYYY-MM-DD'))`,
            {
                callLogID,
                prisonerID,
                receiver_name,
                receiver_relation,
                duration,
                call_date
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding call log:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Update a call log
app.put('/api/call-logs/:id', async (req, res) => {
    try {
        const callLogId = req.params.id;
        const { receiver_name, receiver_relation, duration, call_date } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if call log exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Call_Log WHERE callLogID = :id`,
            [callLogId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Call log not found' 
            });
        }
        
        // Update call log
        await connection.execute(
            `UPDATE Call_Log 
             SET receiver_name = :receiver_name, 
                 receiver_relation = :receiver_relation,
                 duration = :duration,
                 call_date = TO_DATE(:call_date, 'YYYY-MM-DD')
             WHERE callLogID = :id`,
            {
                receiver_name,
                receiver_relation,
                duration,
                call_date,
                id: callLogId
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating call log:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a call log
app.delete('/api/call-logs/:id', async (req, res) => {
    try {
        const callLogId = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if call log exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Call_Log WHERE callLogID = :id`,
            [callLogId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Call log not found' 
            });
        }
        
        // Delete call log
        await connection.execute(
            `DELETE FROM Call_Log WHERE callLogID = :id`,
            [callLogId],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting call log:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Get all disciplinary actions
app.get('/api/disciplinary', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT da.actionID, da.prisonerID, da.action_date, da.reason,
                    p.name AS prisoner_name, c.cellID
             FROM Disciplinary_Action da
             LEFT JOIN Prisoner p ON da.prisonerID = p.prisonerID
             LEFT JOIN Cell c ON p.cellID = c.cellID
             ORDER BY da.action_date DESC`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const actions = result.rows.map(row => ({
                actionID: row[0],
                prisonerID: row[1],
                action_date: row[2],
                reason: row[3],
                prisoner_name: row[4],
                cellID: row[5]
            }));
            
            res.json(actions);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching disciplinary actions:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific disciplinary action
app.get('/api/disciplinary/:id', async (req, res) => {
    const actionId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT da.actionID, da.prisonerID, da.action_date, da.reason,
                    p.name AS prisoner_name, c.cellID
             FROM Disciplinary_Action da
             LEFT JOIN Prisoner p ON da.prisonerID = p.prisonerID
             LEFT JOIN Cell c ON p.cellID = c.cellID
             WHERE da.actionID = :id`,
            [actionId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const action = {
                actionID: row[0],
                prisonerID: row[1],
                action_date: row[2],
                reason: row[3],
                prisoner_name: row[4],
                cellID: row[5]
            };
            
            res.json(action);
        } else {
            res.status(404).json({ error: 'Disciplinary action not found' });
        }
    } catch (err) {
        console.error('Error fetching disciplinary action:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new disciplinary action
app.post('/api/disciplinary', async (req, res) => {
    try {
        const { actionID, prisonerID, action_date, reason } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if action ID already exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Disciplinary_Action WHERE actionID = :id`,
            [actionID]
        );
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Disciplinary Action ID already exists' 
            });
        }
        
        // Insert new disciplinary action
        await connection.execute(
            `INSERT INTO Disciplinary_Action (actionID, prisonerID, action_date, reason) 
             VALUES (:actionID, :prisonerID, TO_DATE(:action_date, 'YYYY-MM-DD'), :reason)`,
            {
                actionID,
                prisonerID,
                action_date,
                reason
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding disciplinary action:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Update a disciplinary action
app.put('/api/disciplinary/:id', async (req, res) => {
    try {
        const actionId = req.params.id;
        const { action_date, reason } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if disciplinary action exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Disciplinary_Action WHERE actionID = :id`,
            [actionId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Disciplinary action not found' 
            });
        }
        
        // Update disciplinary action
        await connection.execute(
            `UPDATE Disciplinary_Action 
             SET action_date = TO_DATE(:action_date, 'YYYY-MM-DD'),
                 reason = :reason
             WHERE actionID = :id`,
            {
                action_date,
                reason,
                id: actionId
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating disciplinary action:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a disciplinary action
app.delete('/api/disciplinary/:id', async (req, res) => {
    try {
        const actionId = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if disciplinary action exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Disciplinary_Action WHERE actionID = :id`,
            [actionId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Disciplinary action not found' 
            });
        }
        
        // Delete disciplinary action
        await connection.execute(
            `DELETE FROM Disciplinary_Action WHERE actionID = :id`,
            [actionId],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting disciplinary action:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Get all visitors - Fixed to match your actual table structure
app.get('/api/visitors', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Check if Visitors table exists
        const tableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'VISITORS'`
        );
        
        if (tableExists.rows[0][0] === 0) {
            console.log('Visitors table does not exist');
            await connection.close();
            return res.json([]);
        }
        
        const result = await connection.execute(
            `SELECT v.visitorNo, v.name, v.prisonerID, v.visitor_relation, v.visit_date, 
                    v.visit_time, p.name AS prisoner_name
             FROM Visitors v
             LEFT JOIN Prisoner p ON v.prisonerID = p.prisonerID
             ORDER BY v.visit_date DESC`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const visitors = result.rows.map(row => ({
                visitorID: row[0],  // Mapping visitorNo to visitorID for frontend consistency
                name: row[1],
                prisonerID: row[2],
                relation: row[3],   // Mapping visitor_relation to relation for frontend consistency
                visit_date: row[4],
                visit_time: row[5],
                prisoner_name: row[6]
            }));
            
            res.json(visitors);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching visitors:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific visitor - Fixed to match your actual table structure
app.get('/api/visitors/:id', async (req, res) => {
    const visitorId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT v.visitorNo, v.name, v.prisonerID, v.visitor_relation, v.visit_date, 
                    v.visit_time, p.name AS prisoner_name
             FROM Visitors v
             LEFT JOIN Prisoner p ON v.prisonerID = p.prisonerID
             WHERE v.visitorNo = :id`,
            [visitorId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const visitor = {
                visitorID: row[0],  // Mapping visitorNo to visitorID for frontend consistency
                name: row[1],
                prisonerID: row[2],
                relation: row[3],   // Mapping visitor_relation to relation for frontend consistency
                visit_date: row[4],
                visit_time: row[5],
                prisoner_name: row[6]
            };
            
            res.json(visitor);
        } else {
            res.status(404).json({ error: 'Visitor not found' });
        }
    } catch (err) {
        console.error('Error fetching visitor:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new visitor - Fixed to match your actual table structure
app.post('/api/visitors', async (req, res) => {
    try {
        const { visitorID, name, prisonerID, relation, visit_date, visit_time } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if visitor ID already exists (using visitorNo column)
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Visitors WHERE visitorNo = :id`,
            [visitorID]
        );
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Visitor ID already exists' 
            });
        }
        
        // Insert new visitor (with correct column names)
        await connection.execute(
            `INSERT INTO Visitors (visitorNo, name, prisonerID, visitor_relation, visit_date, visit_time) 
             VALUES (:visitorID, :name, :prisonerID, :relation, 
                     TO_DATE(:visit_date, 'YYYY-MM-DD'), :visit_time)`,
            {
                visitorID,
                name,
                prisonerID,
                relation,
                visit_date,
                visit_time: visit_time || 'Not specified'
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding visitor:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Update a visitor - Fixed to match your actual table structure
app.put('/api/visitors/:id', async (req, res) => {
    try {
        const visitorId = req.params.id;
        const { name, relation, visit_date, visit_time } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if visitor exists (using visitorNo column)
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Visitors WHERE visitorNo = :id`,
            [visitorId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Visitor not found' 
            });
        }
        
        // Update visitor (with correct column names)
        await connection.execute(
            `UPDATE Visitors 
             SET name = :name,
                 visitor_relation = :relation,
                 visit_date = TO_DATE(:visit_date, 'YYYY-MM-DD'),
                 visit_time = :visit_time
             WHERE visitorNo = :id`,
            {
                name,
                relation,
                visit_date,
                visit_time,
                id: visitorId
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating visitor:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a visitor - Fixed to match your actual table structure
app.delete('/api/visitors/:id', async (req, res) => {
    try {
        const visitorId = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if visitor exists (using visitorNo column)
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Visitors WHERE visitorNo = :id`,
            [visitorId]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Visitor not found' 
            });
        }
        
        // Delete visitor (using visitorNo column)
        await connection.execute(
            `DELETE FROM Visitors WHERE visitorNo = :id`,
            [visitorId],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting visitor:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Get visitor count for dashboard - Fixed to match your actual table structure
app.get('/api/dashboard/visitors/count', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Check if Visitors table exists
        const tableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'VISITORS'`
        );
        
        let count = 0;
        
        if (tableExists.rows[0][0] > 0) {
            // Table exists, get actual count
            const result = await connection.execute(
                `SELECT COUNT(*) FROM Visitors`
            );
            count = result.rows[0][0];
        } else {
            // Return 0 if table doesn't exist
            console.log('Visitors table does not exist. Returning count as 0.');
        }
        
        await connection.close();
        res.json({ count });
    } catch (err) {
        console.error('Error fetching visitor count:', err);
        res.status(500).json({ error: 'Database Error', count: 0 });
    }
});

// Get all prisoners with complete details
app.get('/api/prisoners/all', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT p.prisonerID, p.name, p.age, p.gender, p.crime, 
                    p.date_of_imprisonment, p.total_sentence, p.cellID
             FROM Prisoner p
             ORDER BY p.name`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const prisoners = result.rows.map(row => ({
                prisonerID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                crime: row[4],
                date_of_imprisonment: row[5],
                total_sentence: row[6],
                cellID: row[7]
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

// Get a specific prisoner
app.get('/api/prisoners/:id', async (req, res) => {
    const prisonerId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT p.prisonerID, p.name, p.age, p.gender, p.crime, 
                    p.date_of_imprisonment, p.total_sentence, p.cellID
             FROM Prisoner p
             WHERE p.prisonerID = :id`,
            [prisonerId]
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const prisoner = {
                prisonerID: row[0],
                name: row[1],
                age: row[2],
                gender: row[3],
                crime: row[4],
                date_of_imprisonment: row[5],
                total_sentence: row[6],
                cellID: row[7]
            };
            
            res.json(prisoner);
        } else {
            res.status(404).json({ error: 'Prisoner not found' });
        }
    } catch (err) {
        console.error('Error fetching prisoner:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new prisoner
// Update the Add a new prisoner endpoint to include validation
app.post('/api/prisoners', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Validate required fields
        const { prisonerID, name, age, gender, crime, date_of_imprisonment } = req.body;
        if (!prisonerID || !name || !age || !gender || !crime || !date_of_imprisonment) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields'
            });
        }
        
        // Validate data types and formats
        if (typeof age !== 'number' || age < 18 || age > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Age must be a number between 18 and 100'
            });
        }
        
        // Insert the prisoner with proper data formatting
        const query = `
            INSERT INTO Prisoner (prisonerID, name, age, gender, crime, date_of_imprisonment, total_sentence, cellID)
            VALUES (:prisonerID, :name, :age, :gender, :crime, TO_DATE(:date_of_imprisonment, 'YYYY-MM-DD'), :total_sentence, :cellID)
        `;
        
        await connection.execute(
            query,
            { 
                prisonerID, 
                name, 
                age, 
                gender, 
                crime, 
                date_of_imprisonment,
                total_sentence: req.body.total_sentence || null,
                cellID: req.body.cellID || null
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.status(201).json({ 
            success: true, 
            message: 'Prisoner added successfully'
        });
    } catch (err) {
        console.error('Error adding prisoner:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error adding prisoner: ' + (err.message || err)
        });
    }
});

// Update a prisoner
app.put('/api/prisoners/:id', async (req, res) => {
    try {
        const prisonerId = req.params.id;
        const { name, age, gender, crime, date_of_imprisonment, total_sentence, cellID } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if prisoner exists
        const checkResult = await connection.execute(
            `SELECT cellID FROM Prisoner WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (checkResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Prisoner not found' 
            });
        }
        
        const oldCellID = checkResult.rows[0][0];
        
        // Check if new cell is already occupied by someone else
        if (cellID && cellID !== oldCellID) {
            const cellCheckResult = await connection.execute(
                `SELECT isOccupied, prisonerID FROM Cell WHERE cellID = :id`,
                [cellID]
            );
            
            if (cellCheckResult.rows.length > 0) {
                const isOccupied = cellCheckResult.rows[0][0] === 1;
                const occupyingPrisonerID = cellCheckResult.rows[0][1];
                
                if (isOccupied && occupyingPrisonerID !== prisonerId) {
                    await connection.close();
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Cell is already occupied by another prisoner' 
                    });
                }
            }
        }
        
        // Update prisoner
        await connection.execute(
            `UPDATE Prisoner 
             SET name = :name, 
                 age = :age, 
                 gender = :gender, 
                 crime = :crime, 
                 date_of_imprisonment = TO_DATE(:date_of_imprisonment, 'YYYY-MM-DD'), 
                 total_sentence = :total_sentence, 
                 cellID = :cellID
             WHERE prisonerID = :id`,
            {
                name,
                age,
                gender,
                crime,
                date_of_imprisonment,
                total_sentence,
                cellID,
                id: prisonerId
            },
            { autoCommit: true }
        );
        
        // Handle cell reassignment if needed
        if (oldCellID !== cellID) {
            // If there was a previous cell, mark it as unoccupied
            if (oldCellID) {
                await connection.execute(
                    `UPDATE Cell SET isOccupied = 0, prisonerID = NULL WHERE cellID = :cellID`,
                    { cellID: oldCellID },
                    { autoCommit: true }
                );
            }
            
            // If there's a new cell, mark it as occupied
            if (cellID) {
                await connection.execute(
                    `UPDATE Cell SET isOccupied = 1, prisonerID = :prisonerID WHERE cellID = :cellID`,
                    { prisonerID: prisonerId, cellID },
                    { autoCommit: true }
                );
            }
        }
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating prisoner:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a prisoner
app.delete('/api/prisoners/:id', async (req, res) => {
    try {
        const prisonerId = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if prisoner exists and get their cell
        const checkResult = await connection.execute(
            `SELECT cellID FROM Prisoner WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (checkResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Prisoner not found' 
            });
        }
        
        const cellID = checkResult.rows[0][0];
        
        // Check for foreign key constraints before deletion
        // Check in Disciplinary_Action
        const discCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM Disciplinary_Action WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (discCheckResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete prisoner: Associated disciplinary actions exist' 
            });
        }
        
        // Check in Visitors
        const visitorCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM Visitors WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (visitorCheckResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete prisoner: Associated visitor records exist' 
            });
        }
        
        // Check in Call_Log
        const callLogCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM Call_Log WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (callLogCheckResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete prisoner: Associated call logs exist' 
            });
        }
        
        // Check in Case table if it exists
        const caseTableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'CASE'`
        );
        
        if (caseTableExists.rows[0][0] > 0) {
            const caseCheckResult = await connection.execute(
                `SELECT COUNT(*) FROM "CASE" WHERE prisonerID = :id`,
                [prisonerId]
            );
            
            if (caseCheckResult.rows[0][0] > 0) {
                await connection.close();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot delete prisoner: Associated case records exist' 
                });
            }
        }
        
        // Delete prisoner
        await connection.execute(
            `DELETE FROM Prisoner WHERE prisonerID = :id`,
            [prisonerId],
            { autoCommit: true }
        );
        
        // If prisoner had a cell, update the cell
        if (cellID) {
            await connection.execute(
                `UPDATE Cell SET isOccupied = 0, prisonerID = NULL WHERE cellID = :cellID`,
                { cellID },
                { autoCommit: true }
            );
        }
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting prisoner:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Get available cells
app.get('/api/cells/available', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT c.cellID, c.blockID, b.name AS blockName
             FROM Cell c
             LEFT JOIN Block b ON c.blockID = b.blockID
             WHERE c.isOccupied = 0
             ORDER BY c.cellID`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const cells = result.rows.map(row => ({
                cellID: row[0],
                blockID: row[1],
                blockName: row[2]
            }));
            
            res.json(cells);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching available cells:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get all work assignments
app.get('/api/work-assignments', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Check if Prison_Labor table exists
        const tableExists = await connection.execute(
            `SELECT COUNT(*) FROM user_tables WHERE table_name = 'PRISON_LABOR'`
        );
        
        if (tableExists.rows[0][0] === 0) {
            console.log('Prison_Labor table does not exist');
            await connection.close();
            return res.json([]);
        }
        
        // Get all work assignments with prisoner names
        const result = await connection.execute(
            `SELECT pl.prisonerID, p.name, pl.department, cl.assigned_area
             FROM Prison_Labor pl
             LEFT JOIN Prisoner p ON pl.prisonerID = p.prisonerID
             LEFT JOIN Cleaning_Labor cl ON pl.prisonerID = cl.prisonerID
             ORDER BY p.name`
        );
        
        await connection.close();
        
        if (result.rows.length > 0) {
            const assignments = result.rows.map(row => ({
                prisonerID: row[0],
                name: row[1],
                department: row[2],
                assigned_area: row[3]
            }));
            
            res.json(assignments);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching work assignments:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get prisoners available for work assignment (those not in Prison_Labor)
app.get('/api/prisoners/available-for-work', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        const result = await connection.execute(
            `SELECT p.prisonerID, p.name
             FROM Prisoner p
             WHERE p.prisonerID NOT IN (SELECT prisonerID FROM Prison_Labor)
             ORDER BY p.name`
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
        console.error('Error fetching available prisoners:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific work assignment
app.get('/api/work-assignments/:id', async (req, res) => {
    const prisonerId = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        // Check if the prisoner has a work assignment
        const laborResult = await connection.execute(
            `SELECT pl.prisonerID, p.name, pl.department
             FROM Prison_Labor pl
             LEFT JOIN Prisoner p ON pl.prisonerID = p.prisonerID
             WHERE pl.prisonerID = :id`,
            [prisonerId]
        );
        
        if (laborResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ error: 'Work assignment not found' });
        }
        
        const prisonerID = laborResult.rows[0][0];
        const name = laborResult.rows[0][1];
        const department = laborResult.rows[0][2];
        
        // Check if cleaning labor assignment exists for this prisoner
        const cleaningResult = await connection.execute(
            `SELECT assigned_area FROM Cleaning_Labor WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        let assigned_area = null;
        if (cleaningResult.rows.length > 0) {
            assigned_area = cleaningResult.rows[0][0];
        }
        
        await connection.close();
        
        res.json({
            prisonerID,
            name,
            department,
            assigned_area
        });
    } catch (err) {
        console.error('Error fetching work assignment:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new work assignment
app.post('/api/work-assignments', async (req, res) => {
    try {
        const { prisonerID, department, assigned_area } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if prisoner exists
        const prisonerCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM Prisoner WHERE prisonerID = :id`,
            [prisonerID]
        );
        
        if (prisonerCheckResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Prisoner not found' 
            });
        }
        
        // Check if prisoner already has a work assignment
        const laborCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM Prison_Labor WHERE prisonerID = :id`,
            [prisonerID]
        );
        
        if (laborCheckResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Prisoner already has a work assignment' 
            });
        }
        
        // Insert into Prison_Labor
        await connection.execute(
            `INSERT INTO Prison_Labor (prisonerID, department) VALUES (:prisonerID, :department)`,
            [prisonerID, department],
            { autoCommit: false }
        );
        
        // If department is Cleaning, insert into Cleaning_Labor
        if (department === 'Cleaning' && assigned_area) {
            await connection.execute(
                `INSERT INTO Cleaning_Labor (prisonerID, assigned_area) VALUES (:prisonerID, :assigned_area)`,
                [prisonerID, assigned_area],
                { autoCommit: false }
            );
        }
        
        // If department is Kitchen, insert into Mess_Labor
        if (department === 'Kitchen') {
            await connection.execute(
                `INSERT INTO Mess_Labor (prisonerID) VALUES (:prisonerID)`,
                [prisonerID],
                { autoCommit: false }
            );
        }
        
        // If department is Library, insert into Librarian
        if (department === 'Library') {
            await connection.execute(
                `INSERT INTO Librarian (prisonerID) VALUES (:prisonerID)`,
                [prisonerID],
                { autoCommit: false }
            );
        }
        
        // Commit transaction
        await connection.commit();
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding work assignment:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Update a work assignment
app.put('/api/work-assignments/:id', async (req, res) => {
    try {
        const prisonerId = req.params.id;
        const { department, assigned_area } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if prisoner has a work assignment
        const laborCheckResult = await connection.execute(
            `SELECT department FROM Prison_Labor WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (laborCheckResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Work assignment not found' 
            });
        }
        
        const oldDepartment = laborCheckResult.rows[0][0];
        
        // Begin transaction
        await connection.execute(`SAVEPOINT start_update`);
        
        // Update department in Prison_Labor
        await connection.execute(
            `UPDATE Prison_Labor SET department = :department WHERE prisonerID = :id`,
            [department, prisonerId],
            { autoCommit: false }
        );
        
        // Handle department changes
        if (oldDepartment !== department) {
            // Clean up old department assignments
            if (oldDepartment === 'Cleaning') {
                await connection.execute(
                    `DELETE FROM Cleaning_Labor WHERE prisonerID = :id`,
                    [prisonerId],
                    { autoCommit: false }
                );
            } else if (oldDepartment === 'Kitchen') {
                await connection.execute(
                    `DELETE FROM Mess_Labor WHERE prisonerID = :id`,
                    [prisonerId],
                    { autoCommit: false }
                );
            } else if (oldDepartment === 'Library') {
                await connection.execute(
                    `DELETE FROM Librarian WHERE prisonerID = :id`,
                    [prisonerId],
                    { autoCommit: false }
                );
            }
            
            // Add new department assignments
            if (department === 'Cleaning') {
                await connection.execute(
                    `INSERT INTO Cleaning_Labor (prisonerID, assigned_area) VALUES (:prisonerID, :assigned_area)`,
                    [prisonerId, assigned_area || 'Not specified'],
                    { autoCommit: false }
                );
            } else if (department === 'Kitchen') {
                await connection.execute(
                    `INSERT INTO Mess_Labor (prisonerID) VALUES (:prisonerID)`,
                    [prisonerId],
                    { autoCommit: false }
                );
            } else if (department === 'Library') {
                await connection.execute(
                    `INSERT INTO Librarian (prisonerID) VALUES (:prisonerID)`,
                    [prisonerId],
                    { autoCommit: false }
                );
            }
        } else if (department === 'Cleaning' && assigned_area) {
            // Update assigned area for Cleaning_Labor if it hasn't changed
            const cleaningCheckResult = await connection.execute(
                `SELECT COUNT(*) FROM Cleaning_Labor WHERE prisonerID = :id`,
                [prisonerId]
            );
            
            if (cleaningCheckResult.rows[0][0] > 0) {
                // Update existing cleaning assignment
                await connection.execute(
                    `UPDATE Cleaning_Labor SET assigned_area = :assigned_area WHERE prisonerID = :id`,
                    [assigned_area, prisonerId],
                    { autoCommit: false }
                );
            } else {
                // Insert new cleaning assignment
                await connection.execute(
                    `INSERT INTO Cleaning_Labor (prisonerID, assigned_area) VALUES (:prisonerID, :assigned_area)`,
                    [prisonerId, assigned_area],
                    { autoCommit: false }
                );
            }
        }
        
        // Commit transaction
        await connection.commit();
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating work assignment:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Delete a work assignment
app.delete('/api/work-assignments/:id', async (req, res) => {
    try {
        const prisonerId = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if prisoner has a work assignment
        const laborCheckResult = await connection.execute(
            `SELECT department FROM Prison_Labor WHERE prisonerID = :id`,
            [prisonerId]
        );
        
        if (laborCheckResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Work assignment not found' 
            });
        }
        
        const department = laborCheckResult.rows[0][0];
        
        // Begin transaction
        await connection.execute(`SAVEPOINT start_delete`);
        
        // Delete from specific department table first
        if (department === 'Cleaning') {
            await connection.execute(
                `DELETE FROM Cleaning_Labor WHERE prisonerID = :id`,
                [prisonerId],
                { autoCommit: false }
            );
        } else if (department === 'Kitchen') {
            await connection.execute(
                `DELETE FROM Mess_Labor WHERE prisonerID = :id`,
                [prisonerId],
                { autoCommit: false }
            );
        } else if (department === 'Library') {
            await connection.execute(
                `DELETE FROM Librarian WHERE prisonerID = :id`,
                [prisonerId],
                { autoCommit: false }
            );
        }
        
        // Then delete from Prison_Labor
        await connection.execute(
            `DELETE FROM Prison_Labor WHERE prisonerID = :id`,
            [prisonerId],
            { autoCommit: false }
        );
        
        // Commit transaction
        await connection.commit();
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting work assignment:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Get all books with issue details
app.get('/api/library/books', async (req, res) => {
    try {
        const connection = await getOracleConnection();
        
        // Get all books
        const booksResult = await connection.execute(
            `SELECT bookID, title, author, genre, availability_status
             FROM Library
             ORDER BY bookID`
        );
        
        if (booksResult.rows.length === 0) {
            await connection.close();
            return res.json([]);
        }
        
        const books = booksResult.rows.map(row => ({
            bookID: row[0],
            title: row[1],
            author: row[2],
            genre: row[3],
            availability_status: row[4]
        }));
        
        // Get issue details for each book
        for (const book of books) {
            const issueResult = await connection.execute(
                `SELECT bi.prisonerID, bi.issue_date, bi.return_date, p.name AS prisoner_name
                 FROM book_issues bi
                 LEFT JOIN Prisoner p ON bi.prisonerID = p.prisonerID
                 WHERE bi.bookID = :bookID
                 ORDER BY bi.issue_date DESC
                 FETCH FIRST 1 ROW ONLY`,
                [book.bookID]
            );
            
            if (issueResult.rows.length > 0) {
                book.issue_details = {
                    prisonerID: issueResult.rows[0][0],
                    issue_date: issueResult.rows[0][1],
                    return_date: issueResult.rows[0][2],
                    prisoner_name: issueResult.rows[0][3]
                };
            }
        }
        
        await connection.close();
        
        res.json(books);
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Get a specific book with issue details
app.get('/api/library/books/:id', async (req, res) => {
    const bookID = req.params.id;
    
    try {
        const connection = await getOracleConnection();
        
        // Get book details
        const bookResult = await connection.execute(
            `SELECT bookID, title, author, genre, availability_status
             FROM Library
             WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (bookResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ error: 'Book not found' });
        }
        
        const book = {
            bookID: bookResult.rows[0][0],
            title: bookResult.rows[0][1],
            author: bookResult.rows[0][2],
            genre: bookResult.rows[0][3],
            availability_status: bookResult.rows[0][4]
        };
        
        // Get issue details
        const issueResult = await connection.execute(
            `SELECT bi.prisonerID, bi.issue_date, bi.return_date, p.name AS prisoner_name
             FROM book_issues bi
             LEFT JOIN Prisoner p ON bi.prisonerID = p.prisonerID
             WHERE bi.bookID = :bookID
             ORDER BY bi.issue_date DESC
             FETCH FIRST 1 ROW ONLY`,
            [bookID]
        );
        
        if (issueResult.rows.length > 0) {
            book.issue_details = {
                prisonerID: issueResult.rows[0][0],
                issue_date: issueResult.rows[0][1],
                return_date: issueResult.rows[0][2],
                prisoner_name: issueResult.rows[0][3]
            };
        }
        
        await connection.close();
        
        res.json(book);
    } catch (err) {
        console.error('Error fetching book:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// Add a new book
app.post('/api/library/books', async (req, res) => {
    try {
        const { bookID, title, author, genre } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if book ID already exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Library WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (checkResult.rows[0][0] > 0) {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Book ID already exists' 
            });
        }
        
        // Insert new book
        await connection.execute(
            `INSERT INTO Library (bookID, title, author, genre, availability_status)
             VALUES (:bookID, :title, :author, :genre, 'Available')`,
            {
                bookID,
                title,
                author,
                genre: genre || null
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database Error: ' + err.message 
        });
    }
});

// Update a book
app.put('/api/library/books/:id', async (req, res) => {
    try {
        const bookID = req.params.id;
        const { title, author, genre } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if book exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Library WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Book not found' 
            });
        }
        
        // Update book
        await connection.execute(
            `UPDATE Library
             SET title = :title, author = :author, genre = :genre
             WHERE bookID = :bookID`,
            {
                title,
                author,
                genre: genre || null,
                bookID
            },
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating book:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database Error: ' + err.message 
        });
    }
});

// Delete a book
app.delete('/api/library/books/:id', async (req, res) => {
    try {
        const bookID = req.params.id;
        
        const connection = await getOracleConnection();
        
        // Check if book exists
        const checkResult = await connection.execute(
            `SELECT COUNT(*) FROM Library WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (checkResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Book not found' 
            });
        }
        
        // Check if book has issue records
        const issueCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM book_issues WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (issueCheckResult.rows[0][0] > 0) {
            // Check if there are any unresolved issues (no return date)
            const unresolvedCheckResult = await connection.execute(
                `SELECT COUNT(*) FROM book_issues 
                 WHERE bookID = :bookID AND return_date IS NULL`,
                [bookID]
            );
            
            if (unresolvedCheckResult.rows[0][0] > 0) {
                await connection.close();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot delete book: It is currently issued to a prisoner' 
                });
            }
            
            // Delete issue records first
            await connection.execute(
                `DELETE FROM book_issues WHERE bookID = :bookID`,
                [bookID],
                { autoCommit: false }
            );
        }
        
        // Delete book
        await connection.execute(
            `DELETE FROM Library WHERE bookID = :bookID`,
            [bookID],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting book:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database Error: ' + err.message 
        });
    }
});

// Issue a book to a prisoner
app.post('/api/library/books/issue', async (req, res) => {
    try {
        const { bookID, prisonerID, issue_date } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if book exists and is available
        const bookCheckResult = await connection.execute(
            `SELECT availability_status FROM Library WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (bookCheckResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Book not found' 
            });
        }
        
        if (bookCheckResult.rows[0][0] !== 'Available') {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Book is not available for issue' 
            });
        }
        
        // Check if prisoner exists
        const prisonerCheckResult = await connection.execute(
            `SELECT COUNT(*) FROM Prisoner WHERE prisonerID = :prisonerID`,
            [prisonerID]
        );
        
        if (prisonerCheckResult.rows[0][0] === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Prisoner not found' 
            });
        }
        
        // Insert issue record
        await connection.execute(
            `INSERT INTO book_issues (prisonerID, bookID, issue_date, return_date)
             VALUES (:prisonerID, :bookID, TO_DATE(:issue_date, 'YYYY-MM-DD'), NULL)`,
            {
                prisonerID,
                bookID,
                issue_date
            },
            { autoCommit: false }
        );
        
        // Update book status
        await connection.execute(
            `UPDATE Library SET availability_status = 'Issued' WHERE bookID = :bookID`,
            [bookID],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error issuing book:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database Error: ' + err.message 
        });
    }
});

// Return a book
app.post('/api/library/books/return', async (req, res) => {
    try {
        const { bookID, return_date } = req.body;
        
        const connection = await getOracleConnection();
        
        // Check if book exists and is issued
        const bookCheckResult = await connection.execute(
            `SELECT availability_status FROM Library WHERE bookID = :bookID`,
            [bookID]
        );
        
        if (bookCheckResult.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ 
                success: false, 
                message: 'Book not found' 
            });
        }
        
        if (bookCheckResult.rows[0][0] !== 'Issued') {
            await connection.close();
            return res.status(400).json({ 
                success: false, 
                message: 'Book is not currently issued' 
            });
        }
        
        // Update issue record with return date
        await connection.execute(
            `UPDATE book_issues 
             SET return_date = TO_DATE(:return_date, 'YYYY-MM-DD')
             WHERE bookID = :bookID AND return_date IS NULL`,
            {
                return_date,
                bookID
            },
            { autoCommit: false }
        );
        
        // Update book status
        await connection.execute(
            `UPDATE Library SET availability_status = 'Available' WHERE bookID = :bookID`,
            [bookID],
            { autoCommit: true }
        );
        
        await connection.close();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error returning book:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database Error: ' + err.message 
        });
    }
});

// Start server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
