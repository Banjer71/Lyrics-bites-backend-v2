const express = require("express");
const fetch = require('node-fetch');
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const { jwtDecode } = require('jwt-decode');
const nodemailer = require("nodemailer");
require("dotenv").config();
const User = require("./models/user");
const Lyrics = require("./models/lyrics");

const { createToken, hashPassword, verifyPassword } = require("./utils");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(
  {
    origin: ["https://lyrics-bites-backend-v2.vercel.app"],
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true
  }
));

const PORT = process.env.PORT || 4000;

mongoose.set('strictQuery', true);
mongoose
  .connect(`${process.env.DB_CONNECTION_URL}`)
  .then(console.log("db connected"))
  .catch((err) => console.log(err.message));

app.get("/", (req, res) => {
  res.send("hello Davide");
});

app.get("/v.1/api/all/:email", async (req, res) => {
  console.log(req.params)
  const userInfo = await User.find({ email: req.params.email });
  const allSongs = await Lyrics.find({ _user: userInfo });
  res.json(allSongs);
});



app.get("/v.1/api/song/:id", async (req, res) => {
  const { id } = req.params;
  const song = await Lyrics.findById(id);
  res.json(song);
});

app.get("/v.1/api/:selectParam/:artist", async (req, res) => {
  try {
    const api_key = process.env.VITE_API_KEY_MUSICMATCH;
    const { artist, selectParam } = req.params;
    const baseUrl = 'https://api.musixmatch.com/ws/1.1/track.search';
    const queryParams = `?${selectParam}=${artist}&page_size=4&page=1&f_has_lyrics=1&s_track_rating=desc&apikey=${api_key}`;
    const api_url = `${baseUrl}${queryParams}`;
    const fetch_results = await fetch(api_url);
    const json = await fetch_results.json();
    const result = json.message.body.track_list;
    res.send(result);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/v.1/api/cover/2.0/:albumName", async (req, res) => {
  const apy_key_lastfm = 'd6a6878d30433cedd1a96ed2ed43eef2';
  const { albumName } = req.params
  let name = albumName.replace(/ /gi, "%20");
  const api_url = `http://ws.audioscrobbler.com/2.0/?method=album.search&album=${name}&api_key=${apy_key_lastfm}&format=json`;
  const fetch_results = await fetch(api_url);
  const json = await fetch_results.json();
  const albumCover = JSON.stringify(json.results.albummatches.album[0]?.image[3]["#text"]);
  res.send(albumCover);
});


app.get('/v.1/api/songs/:trackId/:songTrack/:idAlbum/:album', async (req, res) => {
  try {
    const { trackId, songTrack, idAlbum, album } = req.params;
    const api_key_musicmatch = process.env.VITE_API_KEY_MUSICMATCH;
    const api_key_lastfm = process.env.VITE_API_KEY_LASTFM;

    // const [
    //   lyricsResponse,
    //   trackSearchResponse,
    //   albumTracksResponse,
    //   coverAlbumResponse,
    // ] = 
    await Promise.all([
      fetch(`https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${api_key_musicmatch}`),
      fetch(`https://api.musixmatch.com/ws/1.1/track.search?q_track=${songTrack}&apikey=${api_key_musicmatch}`),
      fetch(`https://api.musixmatch.com/ws/1.1/album.tracks.get?album_id=${idAlbum}&apikey=${api_key_musicmatch}`),
      fetch(
        `http://ws.audioscrobbler.com/2.0/?method=album.search&album=${album}&api_key=${api_key_lastfm}&format=json`
      ),
    ]).then((res) => Promise.all(res.map((res) => res.json())))
      .then((data) => {
        res.send({
          data
        });
      })

    // const [lyricsData, trackSearchData, albumTracksData, coverAlbumData] = await Promise.all([
    //   lyricsResponse.json(),
    //   trackSearchResponse.json(),
    //   albumTracksResponse.json(),
    //   coverAlbumResponse.json(),
    // ]);

    // const lyrics = lyricsData.message.body.lyrics;
    // const songTitle = trackSearchData.message.body.track_list;
    // const albumTracksList = albumTracksData.message.body.track_list;
    // const coverAlbum = coverAlbumData.results.albummatches.album[0];
    // console.log('------------------',albumTracksList)
    // res.send({
    //   data
    // });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
});

app.get('/v.1/api/albumTrack/:idTrack/:idAlbum', async (req, res) => {
  try {
    const { idTrack, idAlbum } = req.params;
    const api_key_musicmatch = process.env.VITE_API_KEY_MUSICMATCH;
    // const [
    //   lyricsResponse,
    //   albumTracksResponse,
    // ] = 
    await Promise.all([
      fetch(`https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${idTrack}&apikey=${api_key_musicmatch}`),
      fetch(`https://api.musixmatch.com/ws/1.1/album.tracks.get?album_id=${idAlbum}&apikey=${api_key_musicmatch}`),
    ]).then((res) => Promise.all(res.map((res) => res.json())))
      .then((data) => {
        console.log(data)
        res.send({
          data
        });
      });

    // const [lyricsData, albumTracksData] = await Promise.all([
    //   lyricsResponse.json(),
    //   albumTracksResponse.json(),
    // ]);

    // const lyrics = lyricsData.message.body.lyrics;
    // const albumTracksList = albumTracksData.message.body.track_list;
    // console.log(albumTracksList)
    // res.send({
    //   lyrics, albumTracksList,
    // });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
})


app.post("/v.1/api/authenticate", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    }).lean();

    if (!user) {
      return res.status(403).json({
        message: "Wrong email or password.",
      });
    }

    const passwordValid = await verifyPassword(password, user.password);

    if (passwordValid) {
      const { password, bio, ...rest } = user;
      const userInfo = Object.assign({}, { ...rest });

      const token = createToken(userInfo);

      const decodedToken = jwtDecode(token);
      const expiresAt = decodedToken.exp;


      res.json({
        message: "Authentication successful!",
        token,
        userInfo,
        expiresAt,
      });
    } else {
      res.status(403).json({
        message: "Wrong email or password.",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: "Something went wrong." });
  }
});

app.post("/v.1/api/signup", async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    console.log(req.body);

    const hashedPassword = await hashPassword(req.body.password);

    const userData = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      password: hashedPassword,
    };

    const existingEmail = await User.findOne({
      email: userData.email,
    }).lean();

    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    if (savedUser) {
      const token = createToken(savedUser);
      const decodedToken = jwtDecode(token);
      const expiresAt = decodedToken.exp;

      const { firstName, lastName, email } = savedUser;

      const userInfo = {
        firstName,
        lastName,
        email,
      };

      return res.json({
        message: "User created!",
        token,
        userInfo,
        expiresAt,
      })
    } else {
      return res.status(400).json({
        message: "There was a problem creating your account",
      }, console.log());
    }
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem creating your account",
    });
  }
});

app.post("/v.1/api/song", async (req, res) => {
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
    console.log(';;;;;;: ', newSong);
    await newSong.save();
    res.json({
      type: "SUCCESS",
      id: "saved",
      _id: userId,
      message: `${songTitle} has been successfully added to the db`,
    });
  }
});



app.delete("/v.1/api/song/:id", async (req, res) => {
  const { id } = req.params;
  const deleteItem = await Lyrics.findByIdAndDelete(id);
  res.json(deleteItem);
});

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

app.post("/v.1/api/send_email", async (req, res) => {
  const { lyrics, songTitle, artist, userEmail } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_USER_APP_PASS,
    },
  });

  let messageOptions = {
    from: {
      name: 'Davide',
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
