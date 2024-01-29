const express = require("express");
const Lyrics = require("../models/lyrics");
const User = require("../models/user");
const router = express.Router();

router.post("/v.1/api/song", async (req, res) => {
  const {
    words,
    trackId,
    songTitle,
    album_id,
    album,
    artistName,
    artistId,
    userEmail,
  } = req.body;
  const userInfo = await User.find({ email: userEmail });
  const userId = userInfo[0]._id;
  const userIdExist = await Lyrics.exists({
    $and: [{ trackId: trackId }, { _user: userId }],
  });

  if (userIdExist) {
    res.json({
      type: "EXIST",
      id: "exist",
      _id: userId,
      message: `${songTitle} already exist in the db`,
    });
  } else {
    const newSong = new Lyrics({
      album_id,
      album,
      trackId,
      artistName,
      artistId,
      songTitle,
      words,
      dataSaved: Date.now(),
      _user: userId,
    });
    await newSong.save();
    res.json({
      type: "SUCCESS",
      id: "saved",
      _id: userId,
      message: `${songTitle} has been successfully added to the db`,
    });
  }
});

router.get("/v.1/api/song/:id", async (req, res) => {
  const { id } = req.params;
  const song = await Lyrics.findById(id);
  res.json(song);
});

module.exports = router;
