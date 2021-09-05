const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

require('dotenv').config();

const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const SqlString = require('sqlstring');

/* ----- */

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

/* ----- */

router.post('/', async (req, res) => {
    console.log(req.body);
    const data = req.body;

    // check mariadb to see if this is a new monitor

    const existsQuery = SqlString.format('SELECT * FROM monitors WHERE uuid=?', [data.uuid]);
    const existsConn = await pool.getConnection();
    const existsResponse = await existsConn.query(existsQuery);

    if (!existsResponse[0]) {
        const addQuery = SqlString.format('INSERT INTO monitors (uuid, ip) VALUES (?, ?)', [data.uuid, data.ip]);
        const addConn = await pool.getConnection();
        const addResponse = await addConn.query(addQuery);
        addConn.end();
    }

    existsConn.end();

    const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns');

    const point1 = new Point('server_report')
        .tag('uuid', data.uuid)
        .floatField('playercount', data.playercount)
        .floatField('cpu', data.cpu)
        .floatField('memory', parseInt(data.memory) / 1000000)
        .floatField('tps', data.tps)
        .stringField('minecraftVersion', data.minecraftVersion)
        .stringField('pluginVersion', data.pluginVersion)
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
