'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const chartsSchema = new Schema({
    height :Number 
    , actual_timestamp :Number
    , block_cumulative_size :Number 
    , cumulative_diff_precise :String 
    , difficulty :String 
    , tr_count :Number 
    , difficulty120 :String 
    , hashrate100 :String 
    , hashrate400 :String 
})
// UsersSchema.plugin(autoIncrement.mongoosePlugin, {field: 'sequenceId', step: 1})
db.model('charts', chartsSchema)
