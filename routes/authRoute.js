const express = require("express");
const { jwtDecode } = require("jwt-decode");
const User = require("../models/user");
const router = express.Router();

const { createToken, hashPassword, verifyPassword } = require("../utils");

router.post("/v.1/api/authenticate", async (req, res) => {
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

router.post("/v.1/api/signup", async (req, res) => {
  try {
    const { email, firstName, lastName, nickName } = req.body;
    console.log(req.body);

    const hashedPassword = await hashPassword(req.body.password);

    const userData = {
      email: email.toLowerCase(),
      nickName,
      firstName,
      lastName,
      password: hashedPassword,
      dataSaved: Date.now(),
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

      const { nickName, firstName, lastName, email, dataSaved } = savedUser;
      console.log(savedUser);

      const userInfo = {
        nickName,
        firstName,
        lastName,
        email,
        dataSaved,
      };

      return res.json({
        message: "User created!",
        token,
        userInfo,
        expiresAt,
      });
    } else {
      return res.status(400).json(
        {
          message: "There was a problem creating your account",
        },
        console.log()
      );
    }
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem creating your account",
    });
  }
});

module.exports = router;
