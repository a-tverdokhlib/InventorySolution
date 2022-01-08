const jwt = require('jsonwebtoken');

const Client = require('../models/user');

const sudo   = require('./sudo'); 

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.get('Authorization');
        if (!authHeader) {
            const error = new Error('not Authorized!!');
            error.statusCode = 401;
            error.state = 2;
            throw error;
        }
        const token = req.get('Authorization').split(' ')[1];

        let decodedToken;

        try {

            decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY_ADMIN);

        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 401;
                err.state = 2;
            }
            throw err;
        }
        if (!decodedToken) {
            const error = new Error('not Authorized!!');
            error.statusCode = 401;
            error.state = 2;
            throw error;
        }
        console.log("id == ", decodedToken.userId);
        const client = await Client.findById(decodedToken.userId)
        .select('role')
        .populate({path:'role',select:'name'});

        console.log(client);

        if (!client) {
            const error = new Error('user not found');
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }

        req.userId = decodedToken.userId;
        if(client.role){
            req.userRole = client.role.name;
        }else{
            req.userRole = 'none';
        }

        // next();
        return sudo(req, res, next) ;

        
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};