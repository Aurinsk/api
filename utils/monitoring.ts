const SqlString = require('sqlstring');
const nodemailer = require('nodemailer');
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
            //console.log(row);

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

                    const lastTime = (new Date().getTime() - new Date(mostRecentTime).getTime()) / 60000;

                    const checkStatusQuery = SqlString.format('SELECT status FROM monitors WHERE uuid=?', [row.uuid]);
                    const status = connection.query(checkStatusQuery)
                        .then((status) => {
                            status = status[0].status;

                            if (lastTime > 2 && status === 'up') {
                                const setDownQuery = SqlString.format('UPDATE monitors SET status="down" WHERE uuid=?', [row.uuid]);
                                connection.query(setDownQuery);

                                let messageBody = `
                                Hello,
                                
                                One of your Minecraft server monitors is now down.
                                Below are the details of the incident.
                                
                                Monitor name: ${row.name}
                                IP: ${row.ip}
                                Time noticed at: ${new Date()}
                                `;
                                messageBody = messageBody
                                    .split("\n")
                                    .map((line) => line.trim())
                                    .join("\n");

                                const transporter = nodemailer.createTransport({
                                    host: "mail.aurinsk.com",
                                    port: 587,
                                    secure: false,
                                    auth: {
                                        user: "alerts@aurinsk.com",
                                        pass: "7Y<}Q+LfdMV>ZjEb8c6m"
                                    }
                                });
                                const mailOptions = {
                                    from: 'Alerts <alerts@aurinsk.com>',
                                    to: row.email,
                                    subject: `${row.name} monitor is DOWN`,
                                    text: messageBody
                                }

                                transporter.sendMail(mailOptions);

                                console.log('set down');
                            } else if (lastTime < 2 && status === 'down') {
                                const setUpQuery = SqlString.format('UPDATE monitors SET status="up" WHERE uuid=?', [row.uuid]);
                                connection.query(setUpQuery);

                                let messageBody = `
                                Hello,
                                
                                One of your Minecraft server monitors is now back online.
                                Below are the details of the incident.
                                
                                Monitor name: ${row.name}
                                IP: ${row.ip}
                                Time noticed at: ${new Date()}
                                `;
                                messageBody = messageBody
                                    .split("\n")
                                    .map((line) => line.trim())
                                    .join("\n");

                                const transporter = nodemailer.createTransport({
                                    host: "mail.aurinsk.com",
                                    port: 587,
                                    secure: false,
                                    auth: {
                                        user: "alerts@aurinsk.com",
                                        pass: "7Y<}Q+LfdMV>ZjEb8c6m"
                                    }
                                });
                                const mailOptions = {
                                    from: 'Alerts <alerts@aurinsk.com>',
                                    to: row.email,
                                    subject: `${row.name} monitor is UP`,
                                    text: messageBody
                                }

                                transporter.sendMail(mailOptions);
                            }
                        })
                }
            })
        }

        connection.end();
    }

}