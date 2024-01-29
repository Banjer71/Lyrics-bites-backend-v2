const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const createToken = (user) => {
  // Sign the JWT
  if (!user) {
    throw new Error("No user role specified");
  }
  return jwt.sign(
    {
      sub: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};


const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    // Generate a salt at level 12 strength
    bcrypt.genSalt(12, (err, salt) => {
      if (err) {
        reject(err);
      }
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err);
        }
        resolve(hash);
      });
    });
  });
};

const verifyPassword = (passwordAttempt, hashedPassword) => {
  return bcrypt.compare(passwordAttempt, hashedPassword);
};

// utils.js

function splitLyrics(lyrics) {

  // Split lyrics string into array of lines
  const lines = lyrics.split('\n')

  // Hold verses 
  const verses = []

  // Keep adding lines to current verse until we hit an empty line
  let currentVerse = []
  lines.forEach(line => {
    if(!line.trim()) {
      // Empty line, push current verse
      verses.push(currentVerse.join(' ')) 
      currentVerse = []
    } else {
      // Add line to current verse
      currentVerse.push(line)
    }
  })

  // Add remaining verse
  if(currentVerse.length) {
    verses.push(currentVerse.join(' '))
  }

  return verses
}

function getNextVerse(song) {

  // Get index of last sent verse
  const lastIndex = song.verses.indexOf(song.lastSent)

  // Check if last sent verse exists
  if (lastIndex > -1) { 

    // Return next verse
    return song.verses[lastIndex + 1]

  } else {

    // No last sent, return first verse
    return song.verses[0]

  }

}


module.exports = {
  createToken,
  hashPassword,
  verifyPassword,
  splitLyrics,
  getNextVerse
};



