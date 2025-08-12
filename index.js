const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({ 
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [{
    description: String,
    duration: Number,
    date: String
  }],
});

const User = mongoose.model('User', userSchema);

app.post('/api/users', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const username = req.body.username;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id').exec();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
  }
);

app.post('/api/users/:_id/exercises', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const exerciseDate = date ? new Date(date) : new Date();
    const exercise = {
      description,
      duration: parseInt(duration),
      date: exerciseDate.toDateString(),
    };
    user.log.push(exercise);
    user.count = user.log.length;
    await user.save();  
    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date,
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let log = user.log;
    if (from) {
      const fromDate = new Date(from);
      log = log.filter(ex => new Date(ex.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      log = log.filter(ex => new Date(ex.date) <= toDate);
    }
    if (limit) {
      log = log.slice(0, parseInt(limit));
    }
    res.json({
      username: user.username,  
      count: log.length,
      _id: user._id,
      log: log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Not found middleware
app.use((req, res, next) => {
  res.status(404).type('text').send('Not Found')
})
// Error Handling middleware
app.use((err, req, res, next) => {
  if (err.errors) {
    const messages = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ error: messages.join(', ') })
  }
  res.status(err.status || 500).type('text').send(err.message || 'Internal Server Error')
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
