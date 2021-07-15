const express = require('express');
const router = express.Router();
require('dotenv').config();

const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');

/* ----- */

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

/* ----- */

router.post('/', function(req, res) {
    console.log(req.body);
    const data = req.body;

    const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns');

    const point1 = new Point('server_report')
        .tag('serverID', data.uuid)
        .floatField('player_count', data.playercount)
        .floatField('cpu_usage', data.cpuload)
        .floatField('memory_usage', parseInt(data.memoryusage) / 1000000)
        .floatField('tps', data.tps)
        .stringField('version', data.version)
        .stringField('ip', data.ip);

    writeApi.writePoint(point1);

    writeApi
        .close()
        .then(() => {
            console.log('Finished');
        })

    res.status(200);
    res.end();
});

module.exports = router;