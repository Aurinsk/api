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
const SqlString = require('sqlstring');
const nodemailer = require('nodemailer');
const pool = require('../utils/db');
const dotenv_1 = require("dotenv");
dotenv_1.config();
const { InfluxDB, Point, HttpError } = require('@influxdata/influxdb-client');
/* ----- */
const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
/* ----- */
module.exports = {
    startMonitoring() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield pool.getConnection();
            const response = yield connection.query('SELECT * FROM monitors');
            for (const row of response) {
                console.log(row);
                const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
                const fluxQuery = `from(bucket: "reports") |> range(start: 0, stop: now()) |> filter(fn: (r) => r["uuid"] == "${row.uuid}") |> keep(columns: ["_time"]) |> last(column: "_time")`;
                let mostRecentTime;
                +queryApi.queryRows(fluxQuery, {
                    next(row, tableMeta) {
                        const time = tableMeta.toObject(row)._time;
                        mostRecentTime = time;
                    },
                    error(error) {
                        console.error(error);
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
                                const messageBody = `
                                Hello,
                                
                                One of your Minecraft server monitors is now down.
                                Below are the details of the incident.
                                
                                Monitor name: ${row.name}
                                IP: ${row.ip}
                                Time noticed at: ${new Date().getTime()}
                                `;
                                const transporter = nodemailer.createTransport('smtp://hwgilbert16@gmail.com:tjzecesmgkxgpmsw@smtp.gmail.com');
                                const mailOptions = {
                                    from: 'hwgilbert16@gmail.com',
                                    to: row.email,
                                    subject: `${row.name} monitor is DOWN`,
                                    text: messageBody
                                };
                                transporter.sendMail(mailOptions, (err, data) => {
                                    if (err) {
                                        console.log('Error with sending email');
                                    }
                                    else {
                                        console.log('Email sent successfully');
                                    }
                                });
                                console.log('set down');
                            }
                            else if (lastTime < 2 && status === 'down') {
                                const setUpQuery = SqlString.format('UPDATE monitors SET status="up" WHERE uuid=?', [row.uuid]);
                                connection.query(setUpQuery);
                                const messageBody = `
                                Hello,
                                
                                One of your Minecraft server monitors is now back online.
                                Below are the details of the incident.
                                
                                Monitor name: ${row.name}
                                IP: ${row.ip}
                                Time noticed at: ${new Date().getTime()}
                                `;
                                const transporter = nodemailer.createTransport('smtp://hwgilbert16@gmail.com:tjzecesmgkxgpmsw@smtp.gmail.com');
                                const mailOptions = {
                                    from: 'hwgilbert16@gmail.com',
                                    to: row.email,
                                    subject: `${row.name} monitor is UP`,
                                    text: messageBody
                                };
                                transporter.sendMail(mailOptions, (err, data) => {
                                    if (err) {
                                        console.log('Error with sending email');
                                    }
                                    else {
                                        console.log('Email sent successfully');
                                    }
                                });
                                console.log('set up');
                            }
                        });
                    }
                });
            }
            connection.end();
        });
    }
};
//# sourceMappingURL=monitoring.js.map