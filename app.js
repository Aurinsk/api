const createError = require("http-errors");
const express = require("express");
const logger = require('morgan');
const cors = require('cors');

const reportRouter = require('./routes/report');
const queryRouter = require('./routes/query');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/report', reportRouter);
app.use('/api/query/', queryRouter);

module.exports = app;
