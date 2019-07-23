const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://dbUser:" +
    process.env.MONGO_ATLAS_PW +
    "@cluster0-wegja.mongodb.net/test?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//get style and html folders for app to use
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
const exerciseSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userId: String,
  description: String,
  duration: Number,
  date: { type: String, default: new Date() }
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userName: {
    type: String,
    unique: true
  }
});
const User = mongoose.model("User", userSchema);
//for dev to get user ids if needed, not for production
app.get("/users", (req, res, next) => {
  User.find()
    .select("userName _id")
    .exec()
    .then(docs => {
      const response = {
        count: docs.length,
        users: docs.map(doc => {
          return {
            name: doc.userName,
            id: doc._id
          };
        })
      };
      res.send(response);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});
app.get("/api/exercise/log", (req, res, next) => {
  let id = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = Number(req.query.limit);
  console.log(id);
  Exercise.find({ userId: id })
    .select("description duration date")
    .exec()
    .then(data => {
      if (!isNaN(limit) && data.length > limit) {
        res.status(200).json({
          userId: id,
          logs: data.slice(0, limit)
        });
      }
      if (from && to) {
        res.status(200).json({
          userId: id,
          logs: data.filter(logs => {
            return (
              new Date(logs.date) >= new Date(from) &&
              new Date(logs.date) <= new Date(to)
            );
          })
        });
      }
      if (from) {
        res.status(200).json({
          userId: id,
          logs: data.filter(logs => {
            return new Date(logs.date) >= new Date(from);
          })
        });
      }
      if (to) {
        res.status(200).json({
          userId: id,
          logs: data.filter(logs => {
            return new Date(logs.date) <= new Date(to);
          })
        });
      }
      if (!from && !to) {
        res.status(200).json({
          userId: id,
          logs: data
        });
      }
    });
});
app.post("/api/exercise/add", (req, res, next) => {
  let id = req.body.userId;
  let desc = req.body.description;
  let dur = req.body.duration;
  let day = req.body.date;

  User.findOne({ _id: id }, (err, found) => {
    console.log(desc + dur + day);
    if (err) {
      res.send(err);
    }
    if (found) {
      let username = found.userName;
      let exercise = new Exercise({
        _id: new mongoose.Types.ObjectId(),
        userId: id,
        description: desc,
        duration: dur,
        date: day
      });
      exercise
        .save()
        .then(data => {
          console.log(data);
          res.status(201).json({
            message: "Exercise added to " + username,
            userId: data.id,
            desc: data.description,
            dur: data.duration,
            date: data.date
          });
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({ error: err });
        });
    }
  });
});
app.post("/api/exercise/new-user", (req, res, next) => {
  let input = req.body.username;

  let newUser = new User({
    _id: new mongoose.Types.ObjectId(),
    userName: input
  });
  User.findOne({ userName: input }, (err, found) => {
    if (err) {
      res.send(err);
    }
    if (found) {
      res.send("username taken");
    } else {
      newUser
        .save()
        .then(data => {
          console.log(data);
          res.status(201).json({
            message: "User Created!",
            _id: data._id,
            userName: data.userName
          });
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({ error: err });
        });
    }
  });
});

app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message
    }
  });
});

module.exports = app;
