const Send = require('./../models/send.model');

const sendsGetAll = async (req, res, next) => {
    try {
        const sends = await Send.find();
        return res.status(200).json(sends);
    } catch(err){
        return next(err);
    }
}

module.exports = {
    sendsGetAll,
}