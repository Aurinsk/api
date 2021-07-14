const createError = require("http-errors");
const express = require("express");
const logger = require('morgan');

const reportRouter = require('./routes/report');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/report', reportRouter);

module.exports = app;
