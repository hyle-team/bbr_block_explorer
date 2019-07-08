'use strict'
const db = require('../lib/db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const blockSchema = new Schema({
    height: {
        type: Number,
        required: true,
        unique: true
    },
    actual_timestamp: {
        type: Number
    },
    base_reward: {
        type: String
    },
    blob: String,
    block_cumulative_size: Number,
    block_tself_size: String,
    cumulative_diff_adjusted: String,
    cumulative_diff_precise: String,
    difficulty :Number
    , effective_fee_median :String
    , id :String
    , is_orphan :Number
    , penalty :String
    , prev_id :String
    , summary_reward :String
    , this_block_fee_median :String
    , timestamp :Number
    , total_fee :String
    , total_txs_size :Number
    , tr_count :Number
    , miner_text_info :String
    , pow_seed :String
    , updated: {
        type:Boolean,
        default: false
    }
})
// UsersSchema.plugin(autoIncrement.mongoosePlugin, {field: 'sequenceId', step: 1})
db.model('blocks', blockSchema)
