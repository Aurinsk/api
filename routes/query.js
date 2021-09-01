"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const dotenv_1 = require("dotenv");
const pool = require('../utils/db');
const SqlString = require('sqlstring');
const router = express.Router();
dotenv_1.config();
const { InfluxDB, Point, HttpError } = require('@influxdata/influxdb-client');
/* ----- */
const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;
/* ----- */
// get graph info for monitor
router.get('/graph/:uuid/:type/:time', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const path = req.originalUrl.split("/");
    path.shift();
    const uuid = req.params.uuid;
    const type = req.params.type;
    const time = req.params.time;
    // authentication check query
    const query = SqlString.format('SELECT uuid FROM monitors WHERE email=? AND uuid=?', [req.user.email, uuid]);
    const conn = yield pool.getConnection();
    const response = yield conn.query(query);
    conn.end();
    // check for uuid in response
    if (response.length < 1) {
        res.sendStatus(401);
        res.end();
        return;
    }
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    const fluxQuery = `from(bucket: "reports") |> range(start: -${time}) |> filter(fn: (r) => r["_field"] == "${type}") |> filter(fn: (r) => r["uuid"] == "${uuid}") |> yield(name: "mean")`;
    let data = [];
    let valueArr = [];
    let timeArr = [];
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            valueArr.push(o._value);
            timeArr.push(o._time);
            // console.log(
            //     `${o._time} ${o._measurement} in '${o.location}' (${o.example}): ${o._field}=${o._value}`
            // )
        },
        error(error) {
            console.error(error);
        },
        complete() {
            data.push(valueArr, timeArr);
            console.dir(data);
            res.status(200).json(data);
        },
    });
}));
// get most recent time of monitor
router.get('/time/:uuid/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const uuid = req.params.uuid;
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    const fluxQuery = `from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["uuid"] == "${uuid}") |> keep(columns: ["_time"]) |> last(column: "_time")`;
    let data = [];
    let valueArr = [];
    let timeArr = [];
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            valueArr.push(o._value);
            timeArr.push(o._time);
        },
        error(error) {
            console.error(error);
        },
        complete() {
            data.push(timeArr);
            res.status(200).json(data[0][0]);
            res.end();
        },
    });
}));
// get last value of monitor
router.get('/recent/:type/:uuid/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const uuid = req.params.uuid;
    const type = req.params.type;
    console.log(`from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["_field"] == "${type}") |> filter(fn: (r) => r["uuid"] == "${uuid}") |> last()`);
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    const fluxQuery = `from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["_field"] == "${type}") |> filter(fn: (r) => r["uuid"] == "${uuid}") |> last()`;
    let data = [];
    let valueArr = [];
    let timeArr = [];
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            data.push(o._value);
        },
        error(error) {
            console.error(error);
        },
        complete() {
            res.status(200).json(data[0]);
            res.end();
        },
    });
}));
// get status of monitor
router.get('/status/:uuid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const uuid = req.params.uuid;
    // authentication check query
    const checkQuery = SqlString.format('SELECT uuid FROM monitors WHERE email=? AND uuid=?', [req.user.email, uuid]);
    const checkConn = yield pool.getConnection();
    const checkResponse = yield checkConn.query(checkQuery);
    checkConn.end();
    // check for uuid in response
    if (checkResponse.length < 1) {
        res.sendStatus(401);
        res.end();
        return;
    }
    const query = SqlString.format('SELECT status FROM monitors WHERE uuid=?', [uuid]);
    const connection = yield pool.getConnection();
    const status = yield connection.query(query);
    connection.end();
    res.status(200).json(status);
}));
router.get('/monitors/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = decodeURIComponent(req.params.email);
    if (email !== req.user.email) {
        res.sendStatus(401);
        res.end();
        return;
    }
    const query = SqlString.format('SELECT * FROM monitors WHERE email = ?', [email]);
    const conn = yield pool.getConnection();
    const response = yield conn.query(query);
    conn.end();
    const rowsCopy = [];
    const influxResponses = [];
    // need to push the response to element
    for (let element of response) {
        const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
        const fluxQuery = `from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["uuid"] == "${element.uuid}") |> keep(columns: ["_time"]) |> last(column: "_time")`;
        influxResponses.push(new Promise((res, rej) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    //rowsCopy.push(o._time);
                    element.lastChecked = o._time;
                },
                error(error) {
                    console.error(error);
                },
                complete() {
                    rowsCopy.push(element);
                    res('Received');
                    // loop runs and finishes request on first run
                    // need to make it only send response once loop is fully complete
                    // need to use promises probably
                }
            });
        }));
    }
    Promise.all(influxResponses).then(() => {
        res.json(rowsCopy);
    });
}));
// get plugin version
router.get('/plugin-version', (req, res) => {
    const pluginVersion = process.env.PLUGIN_VERSION;
    res.send(pluginVersion).end();
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
//# sourceMappingURL=query.js.map