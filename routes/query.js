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
router.get('/:uuid/:type/:time', (req, res) => {
    const path = req.originalUrl.split("/");
    path.shift();
    const uuid = req.params.uuid;
    const type = req.params.type;
    const time = req.params.time;
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    const fluxQuery = `from(bucket:"reports") |> range(start: -${time}) |> filter(fn: (r) => r._measurement == "server_report" and r._field == "${type}" and r.serverID == "${uuid}")`;
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
});
router.get('/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = decodeURIComponent(req.params.email);
    const query = SqlString.format('SELECT (name, uuid, ip) FROM monitors WHERE email = ?', [email]);
    const conn = yield pool.getConnection();
    const response = yield conn.query(query);
    conn.end();
    console.log(response[0]);
}));
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