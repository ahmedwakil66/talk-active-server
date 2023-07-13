const express = require('express');
const router = express.Router();
const connect = require('../db');
const { ObjectId } = require('mongodb');
const { verifyJWT } = require('../verificationMiddleware');

// send specific conversation messages of the user
router.get('/:participantIds', verifyJWT, async (req, res) => {
    if(!req.params.participantIds) {
        return res.send({ error: true, message: "Invalid participants ids" })
    }
    const participantIds = req.params.participantIds.split('+');

    if(!participantIds.includes(req.decoded.id)){ //verifying same users
        res.status(403).send({error: true, messages: 'forbidden access'})
    }

    const { messageCollection } = await connect();
    const messages = await messageCollection.find(
        {participants: {$all: participantIds}},
        {
            sort: {created: -1}
        }
    ).toArray()
    res.send(messages);
});

//when a user send message add it in database
router.post('/', verifyJWT, async (req, res) => {
    const { messageCollection } = await connect();
    const newMessage = req.body;
    if (!newMessage) {
        return res.send({ error: true, message: "Invalid message / message's not provided" })
    }
    newMessage.created = new Date().getTime();
    const result = await messageCollection.insertOne(newMessage);
    res.send(result);
});


//get the conversation list with the latest one first
router.get('/list/:userId', verifyJWT, async (req, res) => {
    const userId = req.params.userId;

    if (userId !== req.decoded.id) { //verifying same user
        return res.status(403).send({ error: true, message: 'forbidden access' });
    }

    const { messageCollection } = await connect();
    const { userCollection } = await connect();
    const conversations = await messageCollection.aggregate([
        {
            $match: {
                participants: userId // Match conversations where the user is a participant
            }
        },
        {
            $sort: { created: -1 }
        },
        {
            $project: {
                participants: {
                    $setDifference: ['$participants', [userId]] // Exclude the user's ID from the participant IDs
                }
            }
        }
    ]).toArray();
    const participantIds = [...new Set(conversations.map(conversation => conversation.participants[0]))];
    

    // const participants = await userCollection.find(
    //     { _id: { $in: participantIds.map(id => new ObjectId(id)) } },
    //     { projection: { _id: 1, name: 1, image: 1 } }
    // ).toArray()

    const participants = await userCollection.aggregate([
        {
            $addFields: {
                order: {$indexOfArray: [participantIds.map(id => new ObjectId(id)), "$_id"]}
            }
        },
        {
            $match: {
                _id: {$in: participantIds.map(id => new ObjectId(id))}
            }
        },
        {
            $sort: {
                order: 1
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                image: 1
            }
        }
    ]).toArray()

    res.send(participants)
})




module.exports = router;
