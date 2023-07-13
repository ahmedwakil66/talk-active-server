const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const connect = require('../db');
const { ObjectId } = require('mongodb');


// send a JWT signed signature with the user's database id
router.post('/', async(req, res) => {
    const user = req.body.user;
    if(!user || !user.email){
        res.send({error: true, message: 'provide the email address of the user'});
        return;
    }

    const { userCollection } = await connect();
    const result = await userCollection.findOne({email: user.email});
    if(!result?._id){
        res.send({error: true, message: 'provided user email was invalid / internal server error'});
        return;
    }
    user.id = result._id.toString();
    
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({token});
})



module.exports = router;