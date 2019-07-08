'use strict'
/* Main dependencies */
const express = require('express')

const bodyParser = require('body-parser')
const config = require('config')
const axios = require('axios');
const JSONbig = require('json-bigint');
const db = require('./lib/db')
const Promise = require('bluebird')
const api = config.get('api') + '/json_rpc';
const app = express();
const blocksModel = db.model('blocks')
const chartsModel = db.model('charts')
const outinfoModel = db.model('out_info')
const aliasModel = db.model('aliases')
const altBlocksModel = db.model('alt_blocks')
const poolModel = db.model('pool')
const transactionsModel = db.model('transactions')
let now_blocks_sync = false;
let now_alt_blocks_sync = false;
let globalLastBlock = {
    height: -1
};
let globalBlockInfo = {};

app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use(express.static('dist'));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let maxCount = 1000;

function log(msg) {
    let t = new Date();
    console.log(t.getFullYear() + "-" + t.getMonth() + "-" + t.getDate() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + "." + t.getMilliseconds() + " " + msg);
}

function get_info() {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'getinfo',
            params: {'flags': 0x410},
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return Promise.resolve(response.data);
    })
}

function get_blocks_details(start, count) {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_blocks_details',
            params: {
                "height_start": parseInt(start ? start : 0),
                "count": parseInt(count ? count : 10),
                "ignore_transactions": false
            },
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return response.data;
    })
}

function get_alt_blocks_details(offset, count) {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_alt_blocks_details',
            params: {
                "offset": parseInt(offset),
                "count": parseInt(count)
            },
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return Promise.resolve(response.data);
    })
}

function get_all_pool_tx_list() {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_all_pool_tx_list',
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return Promise.resolve(response.data);
    })
}

function get_pool_txs_details(ids) {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_pool_txs_details',
            params: {'ids': ids},
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return Promise.resolve(response.data);
    })

}

function get_tx_details(tx_hash) {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_tx_details',
            params: {'tx_hash': tx_hash},
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return response.data;
    })
}

function get_out_info(amount, i) {
    return axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_out_info',
            params: {'amount': parseInt(amount), 'i': parseInt(i)},
        },
        transformResponse: [data => JSONbig.parse(data)]
    }).then(response => {
        return Promise.resolve(response.data);
    })
}

function synchronizer() {
    //if(now_blocks_sync === false) {
        return get_info().then(data => {
            return blocksModel.find({}).sort({height:-1}).limit(1).exec().then(lastBlock => {
                if(!lastBlock[0]) {
                    lastBlock = {
                        height: -1,
                        id: "0000000000000000000000000000000000000000000000000000000000000000"
                    }
                } else {
                    lastBlock  = lastBlock[0]._doc;
                    globalLastBlock = lastBlock;
                }

                let blockInfo = data.result;
                globalBlockInfo = blockInfo
                const countAliasesServer = blockInfo.alias_count;
                const countAltBlocksServer = blockInfo.alt_blocks_count;
                const countTrPoolServer = blockInfo.tx_pool_size;
                // console.log('blockinfo', blockInfo)

                //synchronize alt-blocks
                if(countAltBlocksServer > 0 && now_alt_blocks_sync === false ) {
                    now_alt_blocks_sync = true;
                    syncAltBlocks(countAltBlocksServer).then(() => {
                        now_alt_blocks_sync = false;
                    })
                }
                // synchronize blocks
                if (lastBlock.height !== blockInfo.height - 1 && now_blocks_sync === false) {
                    log("need update blocks db=" + lastBlock.height + ' server=' + blockInfo.height);
                    // log("need update aliases db=" + countAliasesDB + ' server=' + countAliasesServer);
                    now_blocks_sync = true;
                    syncBlocks(blockInfo, lastBlock);
                }
            })

        })
    //}
}

function syncAltBlocks(countAltBlocksServer) {
    return altBlocksModel.deleteMany({}).exec().then(() => {
        return get_alt_blocks_details(0, countAltBlocksServer).then(altBlocks => {
            let promiseArray = []
            for(let id in altBlocks) {
                promiseArray.push(
                    new altBlocksModel({
                        height:                     data.result.blocks[id].height,
                        timestamp:                  data.result.blocks[id].timestamp,
                        actual_timestamp:           data.result.blocks[id].actual_timestamp,
                        size:                       data.result.blocks[id].block_cumulative_size,
                        hash:                       data.result.blocks[id].id,
                        difficulty:                 data.result.blocks[id].difficulty.toString(),
                        cumulative_diff_adjusted:   data.result.blocks[id].cumulative_diff_adjusted.toString(),
                        cumulative_diff_precise:    data.result.blocks[id].cumulative_diff_precise.toString(),
                        is_orphan:                  data.result.blocks[id].is_orphan,
                        base_reward:                data.result.blocks[id].base_reward,
                        total_fee:                  data.result.blocks[id].total_fee.toString(),
                        penalty:                    data.result.blocks[id].penalty,
                        summary_reward:             data.result.blocks[id].summary_reward,
                        block_cumulative_size:      data.result.blocks[id].block_cumulative_size,
                        this_block_fee_median:      data.result.blocks[id].this_block_fee_median,
                        effective_fee_median:       data.result.blocks[id].effective_fee_median,
                        total_txs_size:             data.result.blocks[id].total_txs_size,
                        transactions_details:       JSON.stringify(data.result.blocks[id].transactions_details),
                        miner_txt_info:             data.result.blocks[id].miner_text_info,
                        pow_seed :''
                    }).save()
                )
            }
            return Promise.all(promiseArray).then(() => {
                log('Alt blocks data updated with offset: '+countAltBlocksServer)
                return Promise.resolve();
            })
        })
    })
}

function syncBlocks(blockInfo, lastBlock) {
    var count = blockInfo.height - lastBlock.height + 1;
    if (count > 2000) {
        count = 2000;
    }
    if (count < 0) {
        count = 1;
    }
    return get_blocks_details(lastBlock.height + 1, count).then(data => {
        var newBlocks = (data.result && data.result.blocks) ? data.result.blocks : [];
        if (newBlocks.length && lastBlock.id === newBlocks[0].prev_id) {

            const funcs = newBlocks.map(newBlock => () => syncTransactions(newBlock))
            return promiseSerial(funcs).then( result => {
                now_blocks_sync = false;
            }).catch(err => {
                log('Error at syncBlocks[] => syncTransaction[]: ', err);

            });

            // let promiseArray = []
            // for(let i=0; i<newBlocks.length; i++){
            //     promiseArray.push(syncTransactions(newBlocks[i]))
            //
            // }
            // return Promise.all(promiseArray).then(() => {
            //     now_blocks_sync=false
            //     return Promise.resolve()
            // })

        }
    })
}

function syncTransactions(newBlock) {
    const newBlockeEntity = new blocksModel({
        height:                     newBlock.height,
        actual_timestamp:           newBlock.actual_timestamp,
        base_reward:                newBlock.base_reward.toString(),
        blob:                       newBlock.blob,
        block_cumulative_size:      newBlock.block_cumulative_size,
        block_tself_size:           newBlock.block_tself_size,
        cumulative_diff_adjusted:   newBlock.cumulative_diff_adjusted,
        cumulative_diff_precise:    newBlock.cumulative_diff_precise,
        difficulty:                 newBlock.difficulty.toString(),
        effective_fee_median:       newBlock.effective_fee_median,
        id:                         newBlock.id,
        is_orphan:                  newBlock.is_orphan,
        penalty:                    newBlock.penalty,
        prev_id:                    newBlock.prev_id,
        summary_reward:             newBlock.summary_reward.toString(),
        this_block_fee_median:      newBlock.this_block_fee_median,
        timestamp:                  newBlock.timestamp,
        total_fee:                  newBlock.total_fee.toString(),
        total_txs_size:             newBlock.total_txs_size,
        tr_count:                  (newBlock.transactions_details.length) ? newBlock.transactions_details.length: 0,
        miner_text_info:            newBlock.miner_text_info,
        pow_seed:                   newBlock.pow_seed
    })
    return newBlockeEntity.save().then(() => {
        log('New block saved:'+ newBlock.height)
        let hashrate100 = 0;
        let hashrate400 = 0;
        // return chartsModel.find({}).exec().then(rows => {
        // for (let i = 0; i < rows.length; i++) {
        //     hashrate100 = (i > 99 - 1) ? ((newBlock['cumulative_diff_precise'] - rows[rows.length - 100]._doc['cumulative_diff_precise']) / (newBlock['actual_timestamp'] - rows[rows.length - 100]._doc['actual_timestamp'])) : 0;
        //     hashrate400 = (i > 399 - 1) ? ((newBlock['cumulative_diff_precise'] - rows[rows.length - 400]._doc['cumulative_diff_precise']) / (newBlock['actual_timestamp'] - rows[rows.length - 400]._doc['actual_timestamp'])) : 0;
        // }
        const newChart = new chartsModel({
            height:                     newBlock.height,
            actual_timestamp:           newBlock.actual_timestamp,
            block_cumulative_size:      newBlock.block_cumulative_size,
            cumulative_diff_precise:    newBlock.cumulative_diff_precise,
            difficulty:                 newBlock.difficulty,
            tr_count:                  (newBlock.transactions_details.length) ? newBlock.transactions_details.length : 0,
            difficulty120:             (newBlock.difficulty / 120).toFixed(0),
            hashrate100:                hashrate100, //TODO: need to be implemented in more efficient way
            hashrate400:                hashrate400
        })
        return newChart.save().then(chart => {
            log('new chart data saved for block '+ newBlock.height )
            const txfuncs = newBlock.transactions_details.map(txs => () => {
                return new transactionsModel({
                    keeper_block:   txs.keeper_block,
                    id:             txs.id,
                    amount:         txs.amount.toString(),
                    blob_size:      txs.blob_size,
                    extra:          JSON.stringify(txs.extra),
                    fee:            txs.fee.toString(),
                    ins:            JSON.stringify(txs.ins),
                    outs:           JSON.stringify(txs.outs),
                    pub_key:        txs.pub_key,
                    timestamp:      txs.timestamp,
                    attachments:    JSON.stringify(txs.attachments)
                }).save().then(() => {
                    log('Transaction saved id:'+txs.id+ 'for block: '+txs.keeper_block)
                    let trOutPromiseArray = []
                    for(let item in txs.ins) {
                        if(txs.ins[item].global_indexes) {
                            let amount = txs.ins[item].amount
                            let i = txs.ins[item].global_indexes[0]
                            let tx_id = txs.ins[item].global_indexes_related_txs[0].tx_id
                            trOutPromiseArray.push(new outinfoModel({
                                amount: amount.toString(),
                                i: i,
                                tx_id: tx_id,
                                block: newBlock.height
                            }).save())
                        }
                    }
                    return Promise.all(trOutPromiseArray);
                });
            })
            return promiseSerial(txfuncs).then(() => {
                let regAlias = newBlock.registered_alias;
                if(regAlias.alias) {
                    if(regAlias.signature) {
                        return aliasModel.findOneAndReplace({alias: regAlias.alias}, {
                            alias: regAlias.alias,
                            address: regAlias.address,
                            comment: regAlias.comment,
                            tracking_key: regAlias.tracking_key,
                            block: newBlock.height,
                            transact: newBlock.transactions_details[0].id,
                            enabled: 1
                        }).exec().then((data) => {
                            log('alias updated for block'+ newBlock.height )
                            return data
                        })
                    } else {
                        return new aliasModel({
                            alias: regAlias.alias,
                            address: regAlias.address,
                            comment: regAlias.comment,
                            tracking_key: regAlias.tracking_key,
                            block: newBlock.height,
                            transact: newBlock.transactions_details[0].id,
                            enabled: 1
                        }).save().then(() => {
                            log('alias saved for block'+ newBlock.height )
                            return Promise.resolve()
                        }).catch(err => {
                            log('Error, could not save new alias'+regAlias.alias, err)
                            throw new Error(err)
                        })
                    }
                }
                return Promise.resolve();
            }).catch(err => {
                throw new Error(err)
            })
        })
    }, err => {
        log('error happened in sync transaction', err)
        throw new Error(err)
    }).catch(err => {
        throw new Error(err)
    })
}


const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
            promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]))


setInterval(() => {synchronizer()}, 10000);

//synchronizer()

app.get('/get_info', (req, res) => {
    globalBlockInfo.lastBlock = globalLastBlock.height;
    res.send(JSON.stringify(globalBlockInfo));
});

app.get('/get_blocks_details/:start/:count', (req, res) => {
    let start = req.params.start;
    let count = req.params.count;

    if (start && count) {
        blocksModel.find({height: {$gte: start}}).limit(parseInt(count)).exec().then(rows => {
            let data = rows.map(row =>{return row._doc})
            res.send(JSON.stringify(data));
        })
    }
});

app.get('/get_tx_pool_details/:count', (req, res) => {
    let count = req.params.count;
    if (count !== undefined) {
        poolModel.find({}).sort({timestamp: -1}).limit(parseInt(count)).exec().then(rows => {
            let data = rows.map(row =>{return row._doc})
            res.send(JSON.stringify(data));
        });
    } else {
        res.send("Error. Need 'count' params");
    }
});


app.get('/get_main_block_details/:id', (req, res) => {
    let id = req.params.id;
    if (id) {

        Promise.all([ blocksModel.findOne({id: {$gt: id}}).sort({id:1}).limit(1).exec()
            .then(row => {
                if(row) {
                    return Promise.resolve(row._doc)
                } else {
                    return Promise.resolve()
                }
            }),
            blocksModel.findOne({id: id}).exec()
                .then(row => {
                    if(row) {
                        return Promise.resolve(row._doc)
                    } else {
                        return Promise.resolve()
                    }
                })]).spread((nextBlock, currBlock) => {
            if(currBlock) {
                transactionsModel.find({keeper_block: currBlock.height}).then(tx => {
                    if (tx) {
                        for (let i = 0; i < tx.length; i++) {
                            tx[i].extra = JSON.parse(tx[i]._doc.extra);
                            tx[i].ins = JSONbig(tx[i]._doc.ins);
                            tx[i].outs = JSONbig(tx[i]._doc.outs);
                            tx[i].attachments = tx[i]._doc.attachments ? JSON.parse(tx[i]._doc.attachments) : '';
                        }
                        currBlock.transactions_details = tx
                        res.send(JSON.stringify(currBlock));
                    } else {
                        res.send(JSON.stringify("block not found"));
                    }
                })
            } else {
                res.send(JSON.stringify("block not found"));
            }
        })

    }
});


app.get('/get_alt_blocks_details/:offset/:count', (req, res) => {
    let offset = req.params.offset;
    let count = req.params.count;

    if (count > maxCount) {
        count = maxCount;
    }
    altBlocksModel.find({}).sort({height: -1}).skip(parseInt(offset)).limit(parseInt(count)).exec().then(rows => {
        let data = rows.map(row =>{return row._doc})
        res.send(JSON.stringify(data));
    })
});

app.get('/get_alt_block_details/:id', (req, res) => {
    let id = req.params.id;
    if (id) {
        altBlocksModel.findOne({hash: id}).exec().then(row => {
            res.send(JSON.stringify(row._doc));
        })
    }
});

app.get('/get_tx_details/:tx_hash', (req, res) => {
    let tx_hash = req.params.tx_hash;
    if (tx_hash) {
        transactionsModel.findOne({id: tx_hash}).exec().then(tx => {
            if (tx) {
                blocksModel.findOne({height: tx._doc.keeper_block}).exec().then(block => {
                    tx._doc.block_hash = block._doc.id;
                    tx._doc.block_timestamp = block._doc.timestamp;
                    res.send(JSON.stringify(tx._doc));
                })
            } else {
                get_tx_details(tx_hash).then(data => {
                    if (data.result !== undefined) {
                        res.send(JSON.stringify(data.result.tx_info));
                    } else {
                        res.send("Error. Need 'tx_hash' param");
                    }
                })
            }
        });
    } else {
        res.send("Error. Need 'tx_hash' param");
    }
})

app.get('/get_out_info/:amount/:i', (req, res) => {
    let amount = req.params.amount;
    let i = req.params.i;

    if (amount !== undefined && i !== undefined) {
        outinfoModel.findOne({amount: amount, i: i}).exec().then(row => {
            if(row) {
                res.send(JSON.stringify(row._doc))
            } else {
                get_out_info(amount, i).then(data => {
                    res.send(JSON.stringify({tx_id: data.result.tx_id}));
                });
            }
        })
    }
});

app.get('/get_aliases/:offset/:count/:search', (req, res) => {
    let offset = req.params.offset;
    let count = req.params.count;
    let search = req.params.search;
    if (count > maxCount) {
        count = maxCount;
    }
    if (search === 'all' && offset !== undefined && count !== undefined) {
        aliasModel.find({enabled:1}).sort({block: -1}).skip(parseInt(offset)).limit(parseInt(count)).exec().then(rows => {
            if(rows.length>0) {
                let data = rows.map(row => {
                    return row._doc
                })
                res.send(JSON.stringify(data));
            } else {
                res.send('')
            }
        })
    } else if (search !== undefined && offset !== undefined && count !== undefined) {
        aliasModel.find({$or : [{alias: {$regex: '.*' + search + '.*'}},{address: {$regex: '.*' + search + '.*'}},{comment: {$regex: '.*' + search + '.*'}}]}).sort({block: -1}).skip(parseInt(offset)).limit(parseInt(count)).exec().then(rows => {
            if(rows.length>0) {
                let data = rows.map(row => {
                    return row._doc
                })
                res.send(JSON.stringify(data));
            } else {
                res.send('')
            }
        })
    }
});

app.get('/get_chart/:chart/:period', (req, res) => {
    let chart = req.params.chart;
    let period = req.params.period; // temporarily unused

    if (chart !== undefined) {
        let period = Math.round(new Date().getTime() / 1000) - (24 * 3600); // + 86400000
        let period2 = Math.round(new Date().getTime() / 1000) - (48 * 3600); // + 86400000
        // if (params_object.period === 'day') {
        //   // period = parseInt((period.setDate(period.getDate() - 86400000)) / 1000);
        //   period = parseInt(period - 86400000) / 1000;
        //   console.log(period);
        // } else if (params_object.period === 'week') {
        //   period = parseInt((period.setDate(period.getDate()-7)) / 1000);
        // } else if (params_object.period === 'month') {
        //   period = parseInt((period.setMonth(period.getMonth()-1)) / 1000);
        // } else if (params_object.period === '3month') {
        //   period = parseInt((period.setMonth(period.getMonth()-3)) / 1000);
        // } else if (params_object.period === '6month') {
        //   period = parseInt((period.setMonth(period.getMonth()-6)) / 1000);
        // } else if (params_object.period === 'year') {
        //   period = parseInt((period.setMonth(period.getMonth()-12)) / 1000);
        // }
        if (chart === 'all') {
            // db.serialize(function () {
            //   // Charts AvgBlockSize, AvgTransPerBlock, difficultyPoS, difficultyPoW
            //   db.all("SELECT actual_timestamp as at, block_cumulative_size as bcs, tr_count as trc, difficulty as d, type as t FROM charts WHERE actual_timestamp > " + period, function (err, arrayAll) {
            //     if (err) {
            //       log('all charts error', err);
            //     } else {
            //       // Chart Confirmed Transactions Per Day
            //       db.all("SELECT actual_timestamp as at, SUM(tr_count) as sum_trc FROM charts GROUP BY strftime('%Y-%m-%d', datetime(actual_timestamp, 'unixepoch')) ORDER BY actual_timestamp;", function (err, rows0) {
            //         if (err) {
            //           log('all charts confirmed-transactions-per-day', err);
            //         } else {
            //           // Chart HashRate
            //           db.all("SELECT actual_timestamp as at, difficulty120 as d120, hashrate100 as h100, hashrate400 as h400 FROM charts WHERE type=1 AND actual_timestamp > " + period2, function (err, rows1) {
            //             if (err) {
            //               log('all hashrate', err);
            //             } else {
            //               arrayAll[0] = rows0;
            //               arrayAll[1] = rows1;
            //               res.send(JSON.stringify(arrayAll));
            //             }
            //           });
            //         }
            //       });
            //     }
            //   });
            // });
        } else if (chart === 'AvgBlockSize') {
            return blocksModel.aggregate([
                {$project: {
                        "newDate": {$dateToString: {format: "%Y-%m-%d", date: {$add:[new Date(0), {$multiply: ["$actual_timestamp", 1000]}]}}},
                        "block_cumulative_size": "$block_cumulative_size"
                    }},
                {
                    $group: {
                        _id: '$newDate',
                        avgBlocks: {$avg: '$block_cumulative_size'}
                    }
                }
            ]).exec().then(data => {
                const AvgBlockSize = [];
                for (let i = 1; i < data.length; i++) {
                        AvgBlockSize.push([new Date(data[i]._id).getTime(), data[i].avgBlocks]);
                }
                res.send(JSON.stringify(AvgBlockSize));
            })
        } else if (chart === 'AvgTransPerBlock') {
            return blocksModel.aggregate([
                {$project: {
                        "newDate": {$dateToString: {format: "%Y-%m-%d", date: {$add:[new Date(0), {$multiply: ["$actual_timestamp", 1000]}]}}},
                        "tr_count": "$tr_count"
                    }},
                {
                    $group: {
                        _id: '$newDate',
                        tr_count: {$avg: '$tr_count'}
                    }
                }
            ]).exec().then(data => {
                const AvgTransPerBlock = [];
                for (let i = 1; i < data.length; i++) {
                    AvgTransPerBlock.push([new Date(data[i]._id).getTime(), data[i].tr_count]);
                }
                res.send(JSON.stringify(AvgTransPerBlock));
            })
            /*db.serialize(function () {
                db.all("select strftime('%s', date(actual_timestamp, 'unixepoch')) as timestamp, avg(tr_count) as tr_count from blocks GROUP BY date(actual_timestamp, 'unixepoch');", function (err, rows) {
                    // res.writeHead(200, headers);
                    const AvgTransPerBlock = [];
                    for (let i = 1; i < rows.length; i++) {
                        AvgTransPerBlock.push([rows[i].timestamp * 1000, rows[i].tr_count]);
                    }
                    res.send(JSON.stringify(AvgTransPerBlock));
                });
            });*/
        } else if (chart === 'hashRate') {
            // db.serialize(function () {
            //   db.all("SELECT actual_timestamp as at, difficulty120 as d120, hashrate100 as h100, hashrate400 as h400 FROM charts WHERE type=1", function (err, rows) {
            //     if (err) {
            //       log('hashrate', err);
            //     } else {
            //       // for (let i = 0; i < rows.length; i++) {
            //       //     rows[i]['hashrate100'] = (i > 99) ? ((rows[i]['cumulative_diff_precise'] - rows[i - 100]['cumulative_diff_precise']) / (rows[i]['actual_timestamp'] - rows[i - 100]['actual_timestamp'])) : 0;
            //       //     rows[i]['hashrate400'] = (i > 399) ? ((rows[i]['cumulative_diff_precise'] - rows[i - 400]['cumulative_diff_precise']) / (rows[i]['actual_timestamp'] - rows[i - 400]['actual_timestamp'])) : 0;
            //       // }
            //       res.send(JSON.stringify(rows));
            //     }
            //   });
            // });
        } else if (chart === 'difficulty') {
            return blocksModel.aggregate([
                {$project: {
                        "newDate": {$dateToString: {format: "%Y-%m-%d", date: {$add:[new Date(0), {$multiply: ["$actual_timestamp", 1000]}]}}},
                        "difficulty": "$difficulty"
                    }},
                {
                    $group: {
                        _id: '$newDate',
                        difficulty: {$avg: '$difficulty'}
                    }
                }
            ]).exec().then(data => {
                const AvgTransPerBlock = [];
                for (let i = 1; i < data.length; i++) {
                    AvgTransPerBlock.push([new Date(data[i]._id).getTime(), data[i].difficulty]);
                }
                res.send(JSON.stringify(AvgTransPerBlock));
            })
            /*db.serialize(function () {
                db.all("SELECT strftime('%s', date(actual_timestamp, 'unixepoch')) as timestamp, avg(difficulty) as difficulty FROM blocks GROUP BY strftime('%Y-%m-%d', datetime(actual_timestamp, 'unixepoch')) ORDER BY actual_timestamp;", function (err, rows) {
                    // res.writeHead(200, headers);
                    const difficultyArray = [];
                    for (let i = 1; i < rows.length; i++) {
                        difficultyArray.push([rows[i].timestamp * 1000, parseInt(rows[i].difficulty)]);
                    }
                    res.send(JSON.stringify(difficultyArray));
                });
            });*/
        } else if (chart === 'ConfirmTransactPerDay') {
            db.serialize(function () {
                db.all("SELECT actual_timestamp as timestamp, SUM(tr_count) as tr_count FROM blocks GROUP BY strftime('%Y-%m-%d', datetime(actual_timestamp, 'unixepoch')) ORDER BY actual_timestamp;", function (err, rows) {
                    // res.writeHead(200, headers);
                    const ConfirmTransactPerDay = [];
                    for (let i = 1; i < rows.length; i++) {
                        ConfirmTransactPerDay.push([rows[i].timestamp * 1000, rows[i].tr_count]);
                    }
                    res.send(JSON.stringify(ConfirmTransactPerDay));
                });
            });
        }
    }


});

app.get('/search_by_id/:id', (req, res) => {
    let id = req.params.id;

    if (id) {
        blocksModel.findOne({id: id}).exec().then(row => {
            if(!row) {
                altBlocksModel.findOne({id: id}).exec().then(row => {
                    if(!row) {
                        transactionsModel.findOne({id: id}).exec().then(tx => {
                            if(tx) {
                                get_tx_details(id).then(data => {
                                    if (data.result) {
                                        res.send(JSON.stringify({result: "tx"}));
                                    } else {
                                        res.send(JSON.stringify({result: "NOT FOUND"}));
                                    }
                                });
                            } else {
                                res.send(JSON.stringify({result: "tx"}));
                            }
                        })
                    } else {
                        res.send(JSON.stringify({result: "alt_block"}));
                    }
                })
            } else {
                res.send(JSON.stringify({result: "block"}));
            }

        })
    }
});


// API
app.get('/api/get_info/:flags', (req, res) => {
    let flags = req.params.flags;
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'getinfo',
            params: {'flags': parseInt(flags)},
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then((response) => {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_info', error);
        });
});

app.get('/api/get_all_alias_details/', (req, res) => {
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_all_alias_details',
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then((response) => {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_info', error);
        });
})

app.get('/api/get_blocks_details/:start/:count', (req, res) => {
    let start = req.params.start;
    let count = req.params.count;
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_blocks_details',
            params: {
                "height_start": parseInt(start ? start : 0),
                "count": parseInt(count ? count : 10),
                "ignore_transactions": false
            },
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then(function (response) {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_blocks_details failed', error);
        });
});

app.get('/api/get_main_block_details/:id', (req, res) => {
    let id = req.params.id;
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_main_block_details',
            params: {
                'id': id
            },
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then(function (response) {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_main_block_details failed', error);
        });
});

app.get('/api/get_alt_blocks_details/:offset/:count', (req, res) => {
    let offset = req.params.offset;
    let count = req.params.count;
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_alt_blocks_details',
            params: {
                "offset": parseInt(offset),
                "count": parseInt(count)
            },
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then(function (response) {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_alt_blocks_details failed', error);
        });
});

app.get('/api/get_alt_block_details/:id', (req, res) => {
    let id = req.params.id;
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_alt_block_details',
            params: {
                'id': id
            },
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then(function (response) {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_alt_block_details failed', error);
        });
});

app.get('/api/get_all_pool_tx_list', (req, res) => {
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_all_pool_tx_list',
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then((response) => {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_all_pool_tx_list failed', error);
        });
});

app.get('/api/get_pool_txs_details', (req, res) => {
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_pool_txs_details',
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then((response) => {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_pool_txs_details failed', error);
        });
});

app.get('/api/get_pool_txs_brief_details', (req, res) => {
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_pool_txs_brief_details',
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then((response) => {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_pool_txs_details failed', error);
        });
});
app.get('/updateBlocks', (req, res) => {
    blocksModel.find({updated: {$ne: true}}).limit(20000).exec().then(data => {
        if (data) {
        let promiseArray = []
        data.forEach(block => {
            promiseArray.push(
                blocksModel.findOneAndUpdate({height: block._doc.height}, {
                    $set: {
                        difficulty: parseFloat(block._doc.difficulty),
                        updated: true
                    }
                }).exec()
            )
        })
        Promise.all(promiseArray).then(() => {
            res.send(JSON.stringify('good'));
        })
    } else {
            res.send(JSON.stringify('finished'));
        }

    })
})

app.get('/api/get_tx_details/:tx_hash', (req, res) => {
    let tx_hash = req.params.tx_hash;
    axios({
        method: 'get',
        url: api,
        data: {
            method: 'get_tx_details',
            params: {'tx_hash': tx_hash},
        },
        transformResponse: [data => JSONbig.parse(data)]
    })
        .then((response) => {
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            log('api get_tx_details failed', error);
        });
});

app.use(function (req, res) {
    res.sendFile(__dirname + '/dist/index.html');
});

// Start the server
const server = app.listen(parseInt(config.get('front_port')), (req, res, error) => {
    if (error) return log(`Error: ${error}`);
    log(`Server listening on port ${server.address().port}`);
});