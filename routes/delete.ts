const express = require('express');
const router = express.Router();
const pool = require('../utils/db.js');
const axios = require('axios');

const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const SqlString = require('sqlstring');
require('dotenv').config();

/* ----- */

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

/* ----- */

router.delete('/monitor/:uuid', async (req, res) => {
    const uuid = req.params.uuid;

    // authentication check query
    const checkQuery = SqlString.format('SELECT uuid FROM monitors WHERE email=? AND uuid=?', [req.user.email, uuid]);
    const checkConn = await pool.getConnection();
    const checkResponse = await checkConn.query(checkQuery);
    checkConn.end();

    // check for uuid in response
    if (checkResponse.length < 1) {
        res.sendStatus(401);
        res.end();
        return;
    }

    // await fetch(`${url}api/v2/delete?org=${org}&bucket=${bucket}`, {
    //     method: "POST",
    //     body: JSON.stringify({
    //         "start": 0,
    //         "stop": new Date().toISOString(),
    //         "predicate": `exampleTag=\\\\"${uuid}\\\\"`
    //     })
    // });

    const data = JSON.stringify({
        "start": 0,
        "stop": new Date().toISOString(),
        "predicate": `exampleTag=\\\\"${uuid}\\\\"`
    });

    const config = {
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        }
    }

    console.log(`${url}api/v2/delete?org=${org}&bucket=${bucket}`);
    axios.post(`${url}api/v2/delete?org=${org}&bucket=${bucket}`, data, config)
        .then(async () => {
            const query = SqlString.format('DELETE FROM monitors WHERE uuid = ?', [uuid]);
            const connection = await pool.getConnection();
            const response = await connection.query(query);

            res.sendStatus(200);
            res.end();
        })

    // const deleteFromInflux = http.request({
    //     hostname: '192.168.1.137',
    //     port: 8086,
    //     path: `/api/v2/delete/?org=${org}&bucket=${bucket}`,
    //     method: 'POST',
    //     headers: {
    //         'Authorization': `Token ${token}`,
    //         'Content-Type': 'application/json'
    //     }
    // }, async () => {
    //     const query = SqlString.format('DELETE FROM monitors WHERE uuid = ?', [uuid]);
    //     const connection = await pool.getConnection();
    //     const response = await connection.query(query);
    //
    //     res.sendStatus(200);
    //     res.end();
    // })
});

module.exports = router;