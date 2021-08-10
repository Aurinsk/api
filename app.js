const createError = require("http-errors");
const express = require("express");
const logger = require('morgan');
const cors = require('cors');
const jwt = require('express-jwt');
const monitoring = require('./utils/monitoring.js');

const reportRouter = require('./routes/report');
const queryRouter = require('./routes/query');
const createRouter = require('./routes/create');
const deleteRouter = require('./routes/delete');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// check authorization header for a valid jwt
//app.use(jwt({secret: process.env.JWT_SECRET, algorithms: ['HS256']}).unless({path: ['/api/report', /^\/api\/query\/time\/.*/]}));
app.use(jwt({secret: process.env.JWT_SECRET, algorithms: ['HS256']}).unless({path: ['/api/report']}));

app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        res.sendStatus(401);
        res.end();
        return;
    }
    next();
})

setInterval(() => {
    monitoring.startMonitoring();
}, 5000);

app.use('/api/report', reportRouter);
app.use('/api/query/', queryRouter);
app.use('/api/create', createRouter);
app.use('/api/delete', deleteRouter);

module.exports = app;