import express = require('express');
import {config} from "dotenv";
import {FluxTableMetaData} from "@influxdata/influxdb-client";
const pool = require('../utils/db');
const SqlString = require('sqlstring');
const router = express.Router();
config();

const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');

/* ----- */

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

/* ----- */

router.get('/:uuid/:type/:time', async (req, res) => {
    const path = req.originalUrl.split("/");
    path.shift();

    const uuid = req.params.uuid;
    const type = req.params.type;
    const time = req.params.time;

    // authentication check query
    const query = SqlString.format('SELECT uuid FROM monitors WHERE email=? AND uuid=?', [req.user.email, uuid]);
    const conn = await pool.getConnection();
    const response = await conn.query(query);
    conn.end();

    // check for uuid in response
    if (response.length < 1) {
        res.sendStatus(401);
        res.end();
        return;
    }

    const queryApi = new InfluxDB({url, token}).getQueryApi(org)
    const fluxQuery = `from(bucket: "reports") |> range(start: -${time}) |> filter(fn: (r) => r["_field"] == "${type}") |> filter(fn: (r) => r["uuid"] == "${uuid}") |> yield(name: "mean")`;
    let data = [];
    let valueArr = [];
    let timeArr = [];

    queryApi.queryRows(fluxQuery, {
        next(row: string[], tableMeta: FluxTableMetaData) {
            const o = tableMeta.toObject(row);
            valueArr.push(o._value);
            timeArr.push(o._time);
            // console.log(
            //     `${o._time} ${o._measurement} in '${o.location}' (${o.example}): ${o._field}=${o._value}`
            // )
        },
        error(error: Error) {
            console.error(error)
        },
        complete() {
            data.push(valueArr, timeArr);
            console.dir(data);
            res.status(200).json(data);
        },
    })

});

router.get('/time/:uuid/', async (req, res) => {
    const uuid = req.params.uuid;

    const queryApi = new InfluxDB({url, token}).getQueryApi(org);
    const fluxQuery = `from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["uuid"] == "${uuid}") |> keep(columns: ["_time"]) |> last(column: "_time")`;
    let data = [];
    let valueArr = [];
    let timeArr = [];

    queryApi.queryRows(fluxQuery, {
        next(row: string[], tableMeta: FluxTableMetaData) {
            const o = tableMeta.toObject(row);
            valueArr.push(o._value);
            timeArr.push(o._time);
        },
        error(error: Error) {
            console.error(error)
        },
        complete() {
            data.push(timeArr);
            res.status(200).json(data[0][0]);
            res.end();
        },
    })
});

router.get('/status/:uuid', async (req, res) => {
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

    const query = SqlString.format('SELECT status FROM monitors WHERE uuid=?', [uuid]);
    const connection = await pool.getConnection();
    const status = await connection.query(query)[0];

    connection.end();

    res.status(200).json(status);
});

router.get('/:email', async (req, res) => {
    const email = decodeURIComponent(req.params.email);

    if (email !== req.user.email) {
        res.sendStatus(401);
        res.end();
        return;
    }

    const query = SqlString.format('SELECT * FROM monitors WHERE email = ?', [email]);
    const conn = await pool.getConnection();
    const response = await conn.query(query);

    conn.end();

    let rows = [];
    for (const element of response) {
        if (typeof element === 'object') {
            rows.push(element);
        }
    }

    res.send(rows);
});

// router.get('/create/:ip', async (req, res) => {
//     const ip = req.params.ip;
//     const query = SqlString.format('SELECT * FROM monitors WHERE ip = ?', [ip]);
//     const conn = await pool.getConnection();
//     const response = await conn.query(query);
//
//     conn.end();
//
//     if (!response[0]) {
//         res.send('false');
//     }
//
//
//
//     res.send('true');
// })

// router.post('/create', async (req, res) => {
//     const ip = req.body.ip;
//     const email = req.body.email;
//     const name = req.body.name;
//
//     const query = SqlString.format('SELECT * FROM monitors WHERE ip = ?', [ip]);
//     const conn = await pool.getConnection();
//     const response = await conn.query(query);
//
//     conn.end();
//
//     if (!response[0]) {
//         res.send('false');
//         return;
//     }
//
//     const updateQuery = SqlString.format('UPDATE monitors SET name=?, email=? WHERE ip=?', [name, email, ip]);
//     const updateConn = await pool.getConnection();
//     const updateResponse = await updateConn.query(updateQuery);
//
//     updateConn.end();
//
//     res.send('true');
// });

module.exports = router;
