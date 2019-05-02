const mongoose = require('mongoose');
const random = require('mongoose-query-random');

const wordSchema = mongoose.Schema({
    word: String,
    url: String,
    count: Number,
    //khmu: [{word: String, count: Number, audio: String}]
 }, { strict: false });

module.exports = mongoose.model('Word', wordSchema, 'words_v3');