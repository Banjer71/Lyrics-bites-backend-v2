const express = require("express");
const router = express.Router();

// serach the song
router.get("/v.1/api/:selectParam/:artist", async (req, res) => {
  try {
    const api_key = process.env.VITE_API_KEY_MUSICMATCH;
    const { artist, selectParam } = req.params;
    const baseUrl = "https://api.musixmatch.com/ws/1.1/track.search";
    const queryParams = `?${selectParam}=${artist}&page_size=4&page=1&f_has_lyrics=1&s_track_rating=desc&apikey=${api_key}`;
    const api_url = `${baseUrl}${queryParams}`;
    const fetch_results = await fetch(api_url);
    const json = await fetch_results.json();
    const result = json.message.body.track_list;
    res.send(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

// search the cover for the artist card
router.get("/v.1/api/cover/2.0/:albumName", async (req, res) => {
  const apy_key_lastfm = "d6a6878d30433cedd1a96ed2ed43eef2";
  const { albumName } = req.params;
  let name = albumName.replace(/ /gi, "%20");
  const api_url = `http://ws.audioscrobbler.com/2.0/?method=album.search&album=${name}&api_key=${apy_key_lastfm}&format=json`;
  const fetch_results = await fetch(api_url);
  const json = await fetch_results.json();
  const albumCover = JSON.stringify(
    json.results.albummatches.album[0]?.image[3]["#text"]
  );
  res.send(albumCover);
});

router.get(
  "/v.1/api/songs/:trackId/:songTrack/:idAlbum/:album",
  async (req, res) => {
    try {
      const { trackId, songTrack, idAlbum, album } = req.params;
      const api_key_musicmatch = process.env.VITE_API_KEY_MUSICMATCH;
      const api_key_lastfm = process.env.VITE_API_KEY_LASTFM;

      await Promise.all([
        fetch(
          `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${api_key_musicmatch}`
        ),
        fetch(
          `https://api.musixmatch.com/ws/1.1/track.search?q_track=${songTrack}&apikey=${api_key_musicmatch}`
        ),
        fetch(
          `https://api.musixmatch.com/ws/1.1/album.tracks.get?album_id=${idAlbum}&apikey=${api_key_musicmatch}`
        ),
        fetch(
          `http://ws.audioscrobbler.com/2.0/?method=album.search&album=${album}&api_key=${api_key_lastfm}&format=json`
        ),
      ])
        .then((res) => Promise.all(res.map((res) => res.json())))
        .then((data) => {
          console.log(data);
          res.send({
            data,
          });
        });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
);

// get the album track from the sidebar
router.get("/v.1/api/albumTrack/:idTrack/:idAlbum", async (req, res) => {
  try {
    const { idTrack, idAlbum } = req.params;
    const api_key_musicmatch = process.env.VITE_API_KEY_MUSICMATCH;

    await Promise.all([
      fetch(
        `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${idTrack}&apikey=${api_key_musicmatch}`
      ),
      fetch(
        `https://api.musixmatch.com/ws/1.1/album.tracks.get?album_id=${idAlbum}&apikey=${api_key_musicmatch}`
      ),
    ])
      .then((res) => Promise.all(res.map((res) => res.json())))
      .then((data) => {
        console.log("hey", data);
        res.send({
          data,
        });
      });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
