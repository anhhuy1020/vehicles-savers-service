const expressJwt = require('express-jwt');
const config = require('../../config.json');
const mode = config.mode;
const userService = require('../service/UserService');

module.exports = jwt;

function jwt() {
    const secret = config[mode].secret;
    return expressJwt({ secret, algorithms: ['HS256'], isRevoked }).unless({
        path: [
            // public routes that don't require authentication
            '/customers/login',
            '/customers/register',
            '/partners/login',
        ]
    });
}

async function isRevoked(req, payload, 
    done) {
    const user = await userService.getById(payload.id);

    // revoke token if user no longer exists
    if (!user) {
        return done(null, true);
    }

    done();
};