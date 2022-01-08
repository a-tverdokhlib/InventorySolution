const jwt = require('jsonwebtoken');

const Client = require('../models/user');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.get('Sudo');
        
        
        if (!authHeader) {
            return next();
        }
        const token = req.get('Sudo').split(' ')[1];

        let decodedToken;

        try {

            decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY_SUDO);

        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 401;
                err.state = 2;
            }
            throw err;
        }
        if (!decodedToken) {
            return next();
        }

        const client = await Client.findById(decodedToken.userId)
        .select('role')
        .populate({path:'role',select:'name'});

        if (!client) {
            const error = new Error('user not found');
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }

        req.userId = client._id;

        next();

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};