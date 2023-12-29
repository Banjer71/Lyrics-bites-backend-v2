const mongoose = require("mongoose");

const splittedSongSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true
    },
    frequency: {
        type: Number,
        required: true,
    },
    songTitle: {
        type: String,
        required: true
    },
    songSplitted: {
        type: [String],
        require: true,
    },
    _id: {
        type: String,
        required: true
    },
    _user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    lastSent: String,
})

const SplittedLyrics = mongoose.model("SplittedLyrics", splittedSongSchema);

module.exports = SplittedLyrics;
