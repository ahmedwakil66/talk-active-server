const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'})
    }

    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
            return res.status(401).send({error: true, message: 'unauthorized request detected'})
        }
        req.decoded = decoded;
        next();
    })
}




module.exports = {
    verifyJWT,
}