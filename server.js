const express = require("express");
const fetch = require("node-fetch");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();
const User = require("./models/user");
const Lyrics = require("./models/lyrics");
const SplittedLyrics = require("./models/splittedSong");
const cron = require("node-cron");
const Cabin = require("cabin");
const searchRoutes = require("./routes/searchRoute");
const autRoutes = require("./routes/authRoute");
const songRoutes = require("./routes/songRoute");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 4000;

mongoose.set("strictQuery", true);
mongoose
  .connect(`${process.env.MONGODB_URI}`)
  .then(console.log("db connected"))
  .catch((err) => console.log(err.message));
// Schedule a job to send verses at the specified frequency

async function processAndSendEmails() {
  const users = await SplittedLyrics.find().distinct("userEmail");

  for (const userEmail of users) {
    const userSongs = await SplittedLyrics.find({ userEmail });

    for (const song of userSongs) {
      const partOfTheSong = song.songSplitted.length;
      const lyricsToSend = song.songSplitted.shift(); // Get and remove the first element

      if (lyricsToSend) {
        await sendVerseByEmail(
          userEmail,
          song.songTitle,
          lyricsToSend,
          partOfTheSong
        );
        song.lastSent = new Date().toISOString();
        await song.save();
      } else {
        console.log(
          `No more lyrics to send for ${song.songTitle}. Removing from the database.`
        );
        await SplittedLyrics.findByIdAndRemove(song._id);
      }
    }
  }
}

app.get("/v.1/api/timetosend/", async (req, res) => {
  // cron.schedule(`0 9 * * *  `, async () => {
    console.log("Running the cron job");
    await processAndSendEmails();
  // });
});

const sendVerseByEmail = (
  userEmail,
  songTitle,
  lyricsToSend,
  partOfTheSong
) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_USER_APP_PASS,
    },
  });

  let messageOptions = {
    from: {
      name: "Davide",
      address: process.env.GMAIL_USER,
    },
    to: userEmail,
    subject: `Schedule Email ${songTitle} part ${partOfTheSong}`,
    html: `<div
    style="
    font-family:monospace;
    margin: 0 auto;
    max-width: 400px;
    text-align: center;
    line-height: 2">
    <h2>${songTitle}</h2>
    <h3></h3>
    ${lyricsToSend}
    </div>`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(messageOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        reject(error);
      } else {
        console.log("Email successfully sent!!!");
        resolve("Lyrics has been sent correctly!!!");
      }
    });
  });
};

app.get("/", (req, res) => {
  res.send("hello Davide");
});

app.get("/v.1/api/user/:email", async (req, res) => {
  const userInfo = await User.find({ email: req.params.email });
  const allSongs = await Lyrics.find({ _user: userInfo });
  const numberOfSong = allSongs.length;

  res.json({
    userInfo,
    numberOfSong,
  });
});

app.get("/v.1/api/all/:email", async (req, res) => {
  const userInfo = await User.find({ email: req.params.email });
  const allSongs = await Lyrics.find({ _user: userInfo });

  res.json(allSongs);
});

app.use(songRoutes);
app.use(searchRoutes);
app.use(autRoutes);

// delete a single song
app.delete("/v.1/api/song/:id", async (req, res) => {
  const { id } = req.params;
  const deleteItem = await Lyrics.findByIdAndDelete(id);
  res.json(deleteItem);
});

// delete all the song list
app.delete("/v.1/api/all/:email", async (req, res) => {
  const userInfo = await User.find({ email: req.params.email });
  const userId = userInfo[0]._id;
  const deleteAll = await Lyrics.deleteMany({ _user: userId });
  res.json(deleteAll);
});

app.post("/v.1/api/delete", (req, res) => {
  const ids = req.body;
  console.log(ids);
  Lyrics.deleteMany(
    {
      _id: {
        $in: ids,
      },
    },
    () => (err, result) => {
      if (err) {
        res.send(err);
      } else {
        res.send(result);
      }
    }
  );
  res.json("song deleted");
});

app.post("/v.1/api/schedule/:frequency", async (req, res) => {
  console.log(req.body);
  const { frequency, lyrics, userEmail, _id, songTitle, songId } = req.body;
  const theEnd = ["I hope you enjoyed this way of learning"];
  const splittedLyricsArray = lyrics.split("\n\n").map((verse) => verse);
  splittedLyricsArray.pop();
  const songSplitted = [...splittedLyricsArray, ...theEnd];
  const userIdExist = await SplittedLyrics.exists({ _id: _id });

  if (userIdExist) {
    res
      .status(400)
      .send({ message: `Splitted song schedule already exist in the db.` });
  } else {
    const splittedSong = new SplittedLyrics({
      songId,
      userEmail,
      frequency,
      songTitle,
      songSplitted,
      _id,
      lastSent: Date.now(),
    });

    await splittedSong
      .save()
      .then(() => {
        // scheduleJob(userEmail, frequency, songTitle, _id, songId);
        res.json({
          message: `Song splitted received. You will get a verse via email every ${frequency} days. Have fun!!!`,
          data: splittedSong,
        });
      })
      .catch((error) => {
        console.error("Error saving user:", error);
        res.status(500).send("Internal Server Error");
      });
  }
});

app.post("/v.1/api/send_email", async (req, res) => {
  const { lyrics, songTitle, artist, userEmail } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_USER_APP_PASS,
    },
  });

  let messageOptions = {
    from: {
      name: "Davide",
      address: process.env.GMAIL_USER,
    },
    to: userEmail,
    subject: "schedule email",
    html: `<div
    style="
    font-family:monospace;
    margin: 0 auto;
    max-width: 400px;
    text-align: center;
    line-height: 2">
    <h2>${songTitle}</h2>
    <h3>by ${artist}</h3>
    ${lyrics}
    </div>`,
  };

  await transporter.sendMail(messageOptions, (error, info) => {
    if (error) {
      throw error;
    } else {
      console.log("Email successfully sent!!!");
      res.json({ status: "lyrics has been sent correctly!!!" });
    }
  });
});

app.listen(PORT, () => console.log(`server running on ${PORT}`));
module.exports = app;
