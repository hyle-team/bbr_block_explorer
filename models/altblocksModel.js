'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const altblockSchema = new Schema({
    height :Number, 
    timestamp :Number,
    actual_timestamp :Number, 
    size :Number, 
    hash :String, 
    difficulty :String, 
    cumulative_diff_adjusted :String, 
    cumulative_diff_precise :String, 
    is_orphan :Number, 
    base_reward :String, 
    total_fee :String, 
    penalty :String, 
    summary_reward :String, 
    block_cumulative_size :Number, 
    this_block_fee_median :String, 
    effective_fee_median :String, 
    total_txs_size :Number, 
    transactions_details :String, 
    miner_txt_info :String, 
    pow_seed :String
})
// UsersSchema.plugin(autoIncrement.mongoosePlugin, {field: sequenceId, step: 1})
db.model('alt_blocks', altblockSchema)
