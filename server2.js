import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Configure Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Serve Frontend
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

// Chatbot API Endpoint
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.json({ reply: "I didn't understand that. Can you rephrase?" });
    }

    console.log(`User: ${message}`);

    try {
        const result = await model.generateContent(message);
        const aiReply = result.response.text() || "Sorry, I couldn't fetch a response.";
        console.log(`AI: ${aiReply}`);
        res.json({ reply: aiReply });

    } catch (error) {
        console.error("Error:", error);
        res.json({ reply: "Error: Unable to connect to Gemini API" });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
