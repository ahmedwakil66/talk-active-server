const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@craftawesome.bgwffom.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let talkActiveDB;
let userCollection;
let messageCollection;

async function connect() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        if (!talkActiveDB || !userCollection || !messageCollection) {
            await client.connect();

            talkActiveDB = client.db('talkActiveDB');

            userCollection = talkActiveDB.collection('users');
            messageCollection = talkActiveDB.collection('messages');

            // Send a ping to confirm a successful connection
            await client.db("admin").command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
        }
        
        return ({ userCollection, messageCollection });
    }

    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }

    finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}


// Export the connect function
module.exports = connect;