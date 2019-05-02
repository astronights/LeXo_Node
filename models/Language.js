const mongoose = require('mongoose');

const languageSchema = mongoose.Schema({
    languages: [],
    words: []
});

module.exports = mongoose.model('Language', languageSchema, 'languages');