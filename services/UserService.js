const config = require('../config.json');
const mode = config.mode;
const jwt = require('jsonwebtoken');;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const User = db.User;

const ROLE = {
    ADMIN:0,
    PARTNER:1,
    CUSTOMER:2
}

module.exports = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    ROLE
};

async function authenticate({ email, password }) {
    const user = await User.findOne({ email });
    if (user && bcrypt.compareSync(password, user.hash)) {
        getInfoByRole(user);
        const token = jwt.sign({ sub: user.id }, config[mode].secret, { expiresIn: '7d' });
        return {
            ...user.toJSON(),
            token
        };
    }
}

function getInfoByRole(){

}

async function getAll() {
    return await User.find();
}

async function getById(id) {
    return await User.findById(id);
}

async function create(userParam) {
    // validate
    if (await User.findOne({ email: userParam.email })) {
        throw 'Email "' + userParam.email + '" is already taken';
    }
    console.log("create: ", userParam);
    const user = new User(userParam);

    // hash password
    if (userParam.password) {
        user.hash = bcrypt.hashSync(userParam.password, 10);
    }

    // save user
    await user.save();

    getInfoByRole(user);
    const token = jwt.sign({ sub: user.id }, config[mode].secret, { expiresIn: '7d' });
    return {
        ...user.toJSON(),
        token
    };
}

async function update(id, userParam) {
    const user = await User.findById(id);

    // validate
    if (!user) throw 'User not found';
    if (user.email !== userParam.email && await User.findOne({ email: userParam.email })) {
        throw 'Email "' + userParam.email + '" is already taken';
    }

    // hash password if it was entered
    if (userParam.password) {
        userParam.hash = bcrypt.hashSync(userParam.password, 10);
    }

    // copy userParam properties to user
    Object.assign(user, userParam);

    await user.save();
}

async function _delete(id) {
    await User.findByIdAndRemove(id);
}