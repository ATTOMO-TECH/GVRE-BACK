const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sendsSchema = new Schema(
    {
        sendId: { type: String },
        ad: { type: mongoose.Types.ObjectId, ref: 'ads' },
        sendDate: { type: String },
        consultantReference: { type: mongoose.Types.ObjectId, ref: 'consultants' },
        contactReference: { type: mongoose.Types.ObjectId, ref: 'contacts' },
    },
    {
        timestamps: true
    });

const Send = mongoose.model('sends', sendsSchema);

module.exports = Send;