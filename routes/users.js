const express = require('express');
const router = express.Router();
const connect = require('../db');
const { ObjectId } = require('mongodb');


//send ALL user data OR a user's own data. TODO: verify same user/complete
router.get('/', async (req, res) => {
    const { userCollection } = await connect();
    const userId = req.query.userID;
    const userEmail = req.query.email;
    if (userEmail) {
        const user = await userCollection.findOne({ email: userEmail });
        return res.send(user);
    }
});


//create a new user in database
router.post('/', async (req, res) => {
    const { userCollection } = await connect();
    const newUser = req.body;
    newUser.image = 'https://i.ibb.co/S6skC9g/propic.jpg';
    newUser.blockedUsers = [];
    newUser.created = new Date().getTime();
    newUser.friends = [];
    newUser.friendRequestsSent = [];
    newUser.friendRequestsReceived = [];
    newUser.role = 'user';
    newUser.isBanned = false;
    const result = await userCollection.insertOne(newUser);
    res.send(result);
});


//send a user's minified data. TODO: verify jwt
router.get('/basic-info/:id', async(req, res) => {
    const { userCollection } = await connect();
    const userId = req.params.id;
    if(!userId){
        return res.send({error: true, message: 'invalid user id'})
    }
    const userBasicInfo = await userCollection.findOne(
        {_id: new ObjectId(userId)},
        {projection: {_id: 1, name: 1, email: 1, image: 1}}
    )
    res.send(userBasicInfo)
})


//send a user's all friend data (friend's id, name, email, image)
router.get('/friends', async (req, res) => {
    const { userCollection } = await connect();
    const userId = req.query.userID;
    if (!userId || userId === 'undefined') { return res.send({ error: true, message: 'invalid userID' }) };

    const friendIds = await userCollection.findOne({ _id: new ObjectId(userId) }, { projection: { _id: 0, friends: 1 } });
    const friends = await userCollection
        .find(
            { _id: { $in: friendIds.friends.map(id => new ObjectId(id)) } },
            { projection: { _id: 1, name: 1, email: 1, image: 1 } }
        )
        .toArray();

    res.send(friends);
})


//send a finder the found user's minified data (_id, name, email, image) and inject additional data
router.get('/find-by-email/:email', async (req, res) => {
    const { userCollection } = await connect();
    const queryEmail = req.params.email;
    const finderEmail = req.query.finderEmail;
    if (!queryEmail || !queryEmail.includes('@')) {
        return res.send({ error: true, message: 'Invalid query email' });
    }
    const queryUserMinifiedInfo = await userCollection.findOne({ email: queryEmail }, { projection: { _id: 1, name: 1, image: 1, email: 1 } })

    if (finderEmail && finderEmail.includes('@')) {
        const finder = await userCollection.findOne({ email: finderEmail });
        const queryUser = await userCollection.findOne({ email: queryEmail });
        if (queryUser) {
            const queryId = queryUser._id.toString();
            if (finder.friends.indexOf(queryId) !== -1) {
                queryUserMinifiedInfo.isALreadyFriend = true;
            }
            if (finder.friendRequestsReceived.indexOf(queryId) !== -1) {
                queryUserMinifiedInfo.finderReceivedFriendRequest = true;
            }
            if (finder.friendRequestsSent.indexOf(queryId) !== -1) {
                queryUserMinifiedInfo.finderSentFriendRequest = true;
            }
        }
    }

    res.send(queryUserMinifiedInfo)
})


//send received friend requests data of a user
router.get('/friend-requests', async (req, res) => {
    const { userCollection } = await connect();
    const userEmail = req.query.email;
    if (!userEmail || !userEmail.includes('@')) { return res.send({ error: true, message: 'Invalid user email' }) }

    const receivedFriendRequestIds = await userCollection.findOne({ email: userEmail }, { projection: { _id: 0, friendRequestsReceived: 1 } })

    const receivedFriendRequests = await userCollection.find(
        { _id: { $in: receivedFriendRequestIds.friendRequestsReceived.map(id => new ObjectId(id)) } },
        { projection: { _id: 1, name: 1, email: 1, image: 1 } }
    ).toArray()

    res.send(receivedFriendRequests);
})


//modify users data as friend requests are being sent or received (modify 2 times)
router.patch('/friend-request', async (req, res) => {
    const { userCollection } = await connect();
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) { return res.send({ error: true, message: 'require valid senderId and receiverId' }) };

    const senderUpdated = await userCollection.updateOne({ _id: new ObjectId(senderId) }, { $addToSet: { friendRequestsSent: receiverId } })

    const receiverUpdated = await userCollection.updateOne({ _id: new ObjectId(receiverId) }, { $addToSet: { friendRequestsReceived: senderId } });

    res.send({
        acknowledged: true,
        modifiedCount: senderUpdated.modifiedCount + receiverUpdated.modifiedCount,
    })
})


//modify users data as friend requests are being accepted (modify 4 times)
router.patch('/accept-friend-request', async (req, res) => {
    const { userCollection } = await connect();
    const { acceptorId, requestorId } = req.body;

    const acceptorUpdated = await userCollection.updateOne(
        { _id: new ObjectId(acceptorId) },
        { 
            $pull: { friendRequestsReceived: requestorId }, // removing requestorId from acceptor's friendRequestsReceived array
            $addToSet: {friends: requestorId} // adding requestorId in the acceptor's friends array
        }
    )

    const requestorUpdated = await userCollection.updateOne(
        { _id: new ObjectId(requestorId) },
        { 
            $pull: { friendRequestsSent: acceptorId }, // removing acceptorId from requestor's friendRequestsReceived array
            $addToSet: {friends: acceptorId} // adding acceptorId in the requestor's friends array
        }
    )

    res.send({
        acknowledged: true,
        modifiedCount: 2
    })

})


//modify users data as friend requests are being rejected (modify 2 times)
router.patch('/reject-friend-request', async (req, res) => {
    const { userCollection } = await connect();
    const { acceptorId, requestorId, status } = req.body;

    const acceptorUpdated = await userCollection.updateOne( // removing requestorId from acceptor's friendRequestsReceived array
        { _id: new ObjectId(acceptorId) },
        { $pull: { friendRequestsReceived: requestorId } }
    )

    const requestorUpdated = await userCollection.updateOne( // removing acceptorId from requestor's friendRequestsReceived array
        { _id: new ObjectId(requestorId) },
        { $pull: { friendRequestsSent: acceptorId } }
    )

    res.send({
        acknowledged: true,
        modifiedCount: 2
    })

})


module.exports = router;
