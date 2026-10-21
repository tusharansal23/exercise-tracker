const express = require('express');
const app = express();
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false })); // reads form data from POST bodies
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// In-memory storage
const users = []; // { username, _id, log: [{ description, duration, date: Date }] }

const newId = () => crypto.randomBytes(12).toString('hex');

// Format a Date as "Mon Jan 01 1990" using its UTC parts, so the day never shifts
const dateString = (d) =>
  new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toDateString();

// Create a user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) return res.json({ error: 'username is required' });

  const user = { username, _id: newId(), log: [] };
  users.push(user);
  res.json({ username: user.username, _id: user._id });
});

// List all users
app.get('/api/users', (req, res) => {
  res.json(users.map((u) => ({ username: u.username, _id: u._id })));
});

// Add an exercise
app.post('/api/users/:_id/exercises', (req, res) => {
  const user = users.find((u) => u._id === req.params._id);
  if (!user) return res.json({ error: 'unknown user id' });

  const { description, duration, date } = req.body;
  const minutes = Number(duration);
  if (!description || !duration || isNaN(minutes)) {
    return res.json({ error: 'description and a numeric duration are required' });
  }

  const when = date ? new Date(date) : new Date();
  if (isNaN(when.getTime())) return res.json({ error: 'Invalid Date' });

  user.log.push({ description, duration: minutes, date: when });

  res.json({
    username: user.username,
    description,
    duration: minutes,
    date: dateString(when),
    _id: user._id,
  });
});

// Get a user's log, with optional from, to and limit
app.get('/api/users/:_id/logs', (req, res) => {
  const user = users.find((u) => u._id === req.params._id);
  if (!user) return res.json({ error: 'unknown user id' });

  const { from, to, limit } = req.query;
  let log = user.log;

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) log = log.filter((e) => e.date >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) log = log.filter((e) => e.date <= toDate);
  }
  if (limit && !isNaN(Number(limit))) {
    log = log.slice(0, Number(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: dateString(e.date),
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});