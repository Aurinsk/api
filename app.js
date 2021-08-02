const createError = require("http-errors");
const express = require("express");
const logger = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const reportRouter = require('./routes/report');
const queryRouter = require('./routes/query');
const createRouter = require('./routes/create');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
    app.set('authorization-email', jwt.verify(process.env.JWT_SECRET, req.get('authorization', (err) => {
        res.sendStatus(401);
    })))
    next();
});

app.use('/api/report', reportRouter);
app.use('/api/query/', queryRouter);
app.use('/api/create', createRouter);

module.exports = app;