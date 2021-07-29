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

router.get('/:uuid/:type/:time', (req, res) => {
    const path = req.originalUrl.split("/");
    path.shift();

    const uuid = req.params.uuid;
    const type = req.params.type;
    const time = req.params.time;

    const queryApi = new InfluxDB({url, token}).getQueryApi(org)
    const fluxQuery = `from(bucket:"reports") |> range(start: -${time}) |> filter(fn: (r) => r._measurement == "server_report" and r._field == "${type}" and r.uuid == "${uuid}")`;
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

router.get('/:email', async (req, res) => {
    const email = decodeURIComponent(req.params.email);

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
