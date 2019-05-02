const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    user_id: String,
    display_name: String,
    points: Number,
    words_visited: Number,
    created: {
      type: Date,
      default: Date.now
}});

module.exports = mongoose.model('User', userSchema, 'users_v2');