const express = require("express");
const router = express.Router();
const axios = require('axios');

const GEMINI_API_KEY =process.env.GEMINI_API_KEY;

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
    const cleaned = raw.split('\n')[0].trim(); // Take just the first line

    res.json({ translation: cleaned });

  } catch (err) {
    console.error("Translation failed:", err.message);
    res.status(500).json({ error: "Translation failed" });
  }
});

module.exports = router;
