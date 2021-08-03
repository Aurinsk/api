const SqlString = require('sqlstring');
const pool = require('../utils/db');
import {config} from "dotenv";
config();
import {FluxTableMetaData} from "@influxdata/influxdb-client";
const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');

/* ----- */

const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;

/* ----- */

module.exports = {
    async startMonitoring() {
        const connection = await pool.getConnection();
        const response = await connection.query('SELECT * FROM monitors');

        for (const row of response) {
            console.log(row.uuid);

            const queryApi = new InfluxDB({url, token}).getQueryApi(org);
            const fluxQuery = `from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["uuid"] == "${row.uuid}") |> keep(columns: ["_time"]) |> last(column: "_time")`;
            let mostRecentTime;
+
            queryApi.queryRows(fluxQuery, {
                next(row: string[], tableMeta: FluxTableMetaData) {
                    const time = tableMeta.toObject(row)._time;
                    mostRecentTime = time;
                },
                error(error: Error) {
                    console.error(error)
                },
                complete() {
                    console.log(mostRecentTime);

                    const lastTime = (new Date().getTime() - new Date(mostRecentTime).getTime()) / 60000;

                    const checkStatusQuery = SqlString.format('SELECT status FROM monitors WHERE uuid=?', [row.uuid]);
                    const status = connection.query(checkStatusQuery)
                        .then((status) => {
                            status = status[0].status;
                            console.log(status);

                            if (lastTime > 2 && status === 'up') {
                                const setDownQuery = SqlString.format('UPDATE monitors SET status="down" WHERE uuid=?', [row.uuid]);
                                connection.query(setDownQuery);
                                console.log('set down');
                            } else if (lastTime < 2 && status === 'down') {
                                const setUpQuery = SqlString.format('UPDATE monitors SET status="up" WHERE uuid=?', [row.uuid]);
                                connection.query(setUpQuery);
                                console.log('set up');
                            }
                        })
                }
            })
        }

        connection.end();
    }

}