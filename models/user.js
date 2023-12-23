const moongose = require("mongoose");

const userSchema = new moongose.Schema({
  nickName: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  dataSaved: Date,
});

const User = moongose.model("User", userSchema);
module.exports = User;
