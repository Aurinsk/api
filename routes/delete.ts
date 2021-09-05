const express = require('express');
const router = express.Router();
const pool = require('../utils/db.js');
import fetch = require('node-fetch');

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

    const data = JSON.stringify({
        "start": "2021-07-01T06:22:16.000Z",
        "stop": new Date().toISOString(),
        "predicate": `uuid=\"${uuid}\"`
    });

    const config = {
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        }
    }

    try {
        let response = await fetch(`${url}api/v2/delete?org=${org}&bucket=${bucket}`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            },
            body: data
        })

        if (response.status !== 204) {
            console.log(response.status);
            res.json({'StatusCode': 1}).end();
            return;
        }
    } catch (e) {
        res.json({'StatusCode': 1}).end();
        return;
    }

    const query = SqlString.format('DELETE FROM monitors WHERE uuid = ?', [uuid]);
    const connection = await pool.getConnection();
    await connection.query(query);
    connection.end();

    res.json({'StatusCode': 0}).end();
});

module.exports = router;