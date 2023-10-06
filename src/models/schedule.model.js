const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const scheduleSchema = new Schema(
    {
        consultantId: { type: Number },
        Subject: { type: String },
        StartTime: { type: Date },
        EndTime: { type: Date },
        IsAllDay: { type: Boolean },
        IsBlock: { type: Boolean },
        IsReadOnly: { type: Boolean },
        RecurrenceRule: { type: String, default: "" },
        RoomId: { type: Number },
        ResourceId: { type: Number },
    },
    {
        timestamps: true
    });

const Schedule = mongoose.model('schedules', scheduleSchema);

module.exports = Schedule;