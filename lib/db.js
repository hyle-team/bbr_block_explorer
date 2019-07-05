const mongoose = require('mongoose')
const config = require('config')
mongoose.set('useFindAndModify', false);

mongoose.Promise = Promise
mongoose.set('useFindAndModify', false);
let db = mongoose.createConnection(String(config.get('mongodb')), {useNewUrlParser: true})

// db.on('error', console.error(console, 'connection to DB error: '))
db.once('open', function () {
    console.debug('[Server]', 'Connection with MongoDB installed')
})

module.exports = db


require('../models/blockModel')
require('../models/transactionsModel')
require('../models/aliasesModel')
require('../models/altblocksModel')
require('../models/poolModel')
require('../models/chartsModel')
require('../models/outinfoModel')

