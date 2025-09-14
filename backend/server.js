// backend/server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3000;

// Database Connection URI
const mongoUri = 'mongodb://127.0.0.1:27017';
const dbName = 'dashboardDB';

app.use(cors());
app.use(express.json());

// A variable to hold the database connection reference
let db;

// Function to check the health of a single application
const checkApplicationHealth = async (url) => {
    try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.status === 200 ? 'up' : 'down';
    } catch (error) {
        return 'down';
    }
};

// New helper function to check multiple applications at once
const checkBulkHealth = async (applications) => {
    return Promise.all(applications.map(async (app) => {
        if (app.prodUrl) {
            app.status = await checkApplicationHealth(app.prodUrl);
        } else {
            app.status = 'down';
        }
        return app;
    }));
};

// Start the server and connect to the database
async function startServer() {
    try {
        const client = new MongoClient(mongoUri);
        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db(dbName);

        // API Endpoint: Get all applications with health status
        app.get('/api/applications', async (req, res) => {
            try {
                const applications = await db.collection('applications').find({}).toArray();

                const applicationsWithStatus = await Promise.all(applications.map(async (app) => {
                    app.status = await checkApplicationHealth(app.prodUrl);
                    return app;
                }));

                res.json(applicationsWithStatus);
            } catch (err) {
                res.status(500).json({ message: 'Error fetching applications', error: err.message });
            }
        });

        // API Endpoint: Add a new application
        app.post('/api/applications', async (req, res) => {
    try {
        const newApp = req.body;
        // Add an initial status before saving to DB
        newApp.status = await checkApplicationHealth(newApp.prodUrl);
        const result = await db.collection('applications').insertOne(newApp);

        // A better response for newer MongoDB drivers
        if (result.acknowledged) {
            res.status(201).json({ 
                message: 'Application added successfully', 
                _id: result.insertedId 
            });
        } else {
            res.status(500).json({ message: 'Failed to add application' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error adding application', error: err.message });
    }
});

app.post('/api/applications/bulk', async (req, res) => {
    try {
        const applications = req.body;
        if (!Array.isArray(applications) || applications.length === 0) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array of applications.' });
        }

        const appsWithStatus = await checkBulkHealth(applications);
        
        const result = await db.collection('applications').insertMany(appsWithStatus);

        if (result.acknowledged) {
            res.status(201).json({ message: `Successfully added ${result.insertedCount} applications!` });
        } else {
            res.status(500).json({ message: 'Failed to insert all applications.' });
        }
    } catch (err) {
        console.error('Bulk upload error:', err);
        res.status(500).json({ message: 'Error processing bulk upload.', error: err.message });
    }
});

        // API Endpoint: Update an application
        app.put('/api/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Use object destructuring to safely get updated data
        // and prevent the _id from being included in the update
        const { _id, ...updatedData } = req.body;

        console.log('Received ID:', id);
        console.log('Updated Data:', updatedData);

        // Check for a valid ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        // Re-check status on update if the Prod URL changes
        if (updatedData.prodUrl) {
            updatedData.status = await checkApplicationHealth(updatedData.prodUrl);
        }

        const result = await db.collection('applications').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (result.acknowledged) {
            res.status(200).json({ message: 'Application updated successfully' });
        } else {
            res.status(500).json({ message: 'Failed to update application' });
        }
    } catch (err) {
        console.error('Error updating application:', err);
        res.status(500).json({ message: 'Error updating application', error: err.message });
    }
});

        // API Endpoint: Delete an application
        app.delete('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check for a valid ObjectId
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    const result = await db.collection('applications').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (result.acknowledged) {
        res.status(200).json({ message: 'Application deleted successfully' });
    } else {
        res.status(500).json({ message: 'Failed to delete application' });
    }
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Error deleting application', error: err.message });
  }
});
        app.listen(port, () => {
            console.log(`Server listening on http://localhost:${port}`);
        });

    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1); // Exit with an error if the database connection fails
    }
}

// Start the application
startServer();