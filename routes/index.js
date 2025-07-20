const express = require("express");
const router = express.Router();

router.get("/", function (req, res) {
  res.render("test");
});

router.get("/test",function(req,res){
  res.render("test");
})

router.get("/chat", function (req, res) {
  res.render("chat");
});

router.get("/error",function(req,res){
  res.render("error");
})

module.exports = router;
