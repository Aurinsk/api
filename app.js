const createError = require("http-errors");
const express = require("express");
const logger = require('morgan');
const cors = require('cors');
const jwt = require('express-jwt');

const reportRouter = require('./routes/report');
const queryRouter = require('./routes/query');
const createRouter = require('./routes/create');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// check authorization header for a valid jwt
app.use(jwt({secret: process.env.JWT_SECRET, algorithms: ['HS256']}).unless({path: ['/api/report']}));

app.use('/api/report', reportRouter);
app.use('/api/query/', queryRouter);
app.use('/api/create', createRouter);

module.exports = app;