const express = require("express");
const router = express.Router();
const axios = require('axios');
const path = require("path");
const {chatPageController} =  require("../controllers/chatController");
const { SendEmailController } = require("../controllers/emailController");
const GEMINI_API_KEY =process.env.GEMINI_API_KEY;

router.get("/", function (req, res) {
  res.render("test");
});

router.get("/test",function(req,res){
  res.render("test");
})

// router.get("/chat", function (req, res) {
//   res.render("chat");
// });
router.get("/chat", chatPageController);


router.get("/error",function(req,res){
  res.render("error");
})



router.post("/translate", async (req, res) => {
  const { text, language } = req.body;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Give only the exact translation of the following sentence to ${language} without explanation or context:\n\n"${text}"`
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const raw = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Translation failed.";
    // const cleaned = raw.split('\n')[0].trim(); 
    const cleaned = raw.trim();

    res.json({ translation: cleaned });

  } catch (err) {
    console.error("Translation failed:", err.message);
    res.status(500).json({ error: "Translation failed" });
  }
});

router.post("/send-email", SendEmailController);

module.exports = router;
