import express = require('express');
import {config} from "dotenv";
import {FluxTableMetaData} from "@influxdata/influxdb-client";
const router = express.Router();
config();

const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');

/* ----- */

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

/* ----- */

router.get('/:uuid/:type/:time', function(req, res) {
    const path = req.originalUrl.split("/");
    path.shift();

    const uuid = req.params.uuid;
    const type = req.params.type;
    const time = req.params.time;

    const queryApi = new InfluxDB({url, token}).getQueryApi(org)
    const fluxQuery = `from(bucket:"reports") |> range(start: -${time}) |> filter(fn: (r) => r._measurement == "server_report" and r._field == "${type}" and r.serverID == "${uuid}")`;
    let values = [];

    queryApi.queryRows(fluxQuery, {
        next(row: string[], tableMeta: FluxTableMetaData) {
            const o = tableMeta.toObject(row)
            values.push(o._value);
            // console.log(
            //     `${o._time} ${o._measurement} in '${o.location}' (${o.example}): ${o._field}=${o._value}`
            // )
        },
        error(error: Error) {
            console.error(error)
        },
        complete() {
            console.dir(values);
            res.json(values);
        },
    })

    //res.end();

});

module.exports = router;
