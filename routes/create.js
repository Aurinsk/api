const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const SqlString = require('sqlstring');

router.post('/', async (req, res) => {
    const ip = req.body.ip;
    const email = req.body.email;
    const name = req.body.name;

    if (email !== req.user.email) {
        res.sendStatus(401);
        res.end();
        return;
    }

    const query = SqlString.format('SELECT * FROM monitors WHERE ip = ?', [ip]);
    const conn = await pool.getConnection();
    const response = await conn.query(query);

    conn.end();

    if (!response[0]) {
        res.send('false');
        return;
    }

    if (response[0].email) {
        res.send('exists');
        return;
    }

    const updateQuery = SqlString.format('UPDATE monitors SET name=?, email=? WHERE ip=?', [name, email, ip]);
    const updateConn = await pool.getConnection();
    const updateResponse = await updateConn.query(updateQuery);

    updateConn.end();

    res.send('true');
});

module.exports = router;