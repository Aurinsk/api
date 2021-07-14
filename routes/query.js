"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const dotenv_1 = require("dotenv");
const router = express.Router();
dotenv_1.config();
const { InfluxDB, Point, HttpError } = require('@influxdata/influxdb-client');
/* ----- */
const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;
/* ----- */
router.get('/:uuid/:type/:time', function (req, res) {
    const path = req.originalUrl.split("/");
    path.shift();
    const uuid = req.params.uuid;
    const type = req.params.type;
    const time = req.params.time;
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    const fluxQuery = `from(bucket:"reports") |> range(start: -${time}) |> filter(fn: (r) => r._measurement == "server_report" and r._field == "${type}" and r.serverID == "${uuid}")`;
    let values = [];
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            values.push(o._value);
            // console.log(
            //     `${o._time} ${o._measurement} in '${o.location}' (${o.example}): ${o._field}=${o._value}`
            // )
        },
        error(error) {
            console.error(error);
        },
        complete() {
            console.dir(values);
            res.json(values);
        },
    });
    //res.end();
});
module.exports = router;
//# sourceMappingURL=query.js.map