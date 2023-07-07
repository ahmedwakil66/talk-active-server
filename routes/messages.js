const express = require('express');
const router = express.Router();
const connect = require('../db');
const { ObjectId } = require('mongodb');

router.get('/:participantIds', async (req, res) => {
    const { messageCollection } = await connect();
    if(!req.params.participantIds) {
        return res.send({ error: true, message: "Invalid participants ids" })
    }
    const participantIds = req.params.participantIds.split('+');
    const messages = await messageCollection.find(
        {participants: {$all: participantIds}},
        {
            sort: {created: -1}
        }
    ).toArray()
    res.send(messages);
});

//when a user send message add it in database
router.post('/', async (req, res) => {
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
router.get('/list/:userId', async (req, res) => {
    const { messageCollection } = await connect();
    const { userCollection } = await connect();
    const userId = req.params.userId;
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
