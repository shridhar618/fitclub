const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

// Configure environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Configure Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Serve Frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/views/index.html"));
});

// Chatbot API Endpoint
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ reply: "I didn't understand that. Can you rephrase?" });
    }

    console.log(`User: ${message}`);

    try {
        const result = await model.generateContent(message);
        const aiReply = result.response.text() || "Sorry, I couldn't fetch a response.";
        console.log(`AI: ${aiReply}`);
        res.json({ reply: aiReply });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ reply: "Error: Unable to connect to Gemini API" });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});