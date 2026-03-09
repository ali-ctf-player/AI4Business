const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini
const ai = new GoogleGenAI({});

// --- 1. AI Ecosystem Advisor (Live Chat) ---
exports.askEcosystemAdvisor = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const systemPrompt = `You are an expert AI Ecosystem Advisor for the SES (Startup Ecosystem Support) platform in Azerbaijan. 
    Your goal is to help users understand startup investment strategies, market trends in the MENA and Caucasus regions, 
    and how to navigate the SES platform. Keep your answers concise, professional, and helpful.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Advisor Error:', error.message);
    res.status(500).json({ error: "AI Advisor is temporarily unavailable." });
  }
};

// --- 2. AI Product Examiner (GPT-4 Powered Analysis) ---
exports.examineProduct = async (req, res) => {
  try {
    const { pitchText, analysisFocus } = req.body; // focus can be 'full', 'market', 'risk', 'pitch'
    if (!pitchText) return res.status(400).json({ error: "Pitch text is required" });

    let systemPrompt = "You are a top-tier Venture Capital analyst. Evaluate the provided startup pitch. ";
    
    if (analysisFocus === 'market') {
      systemPrompt += "Focus strictly on Product-Market Fit, Total Addressable Market (TAM), and customer segmentation.";
    } else if (analysisFocus === 'risk') {
      systemPrompt += "Focus strictly on identifying regulatory, technical, and execution risks, and provide mitigation strategies.";
    } else if (analysisFocus === 'pitch') {
      systemPrompt += "Focus on the storytelling. Rewrite the pitch to be more compelling, concise, and investor-ready.";
    } else {
      systemPrompt += "Provide a full analysis: Strengths, Weaknesses, Market Opportunity, and give it an 'Investor Readiness Score' out of 100.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this pitch:\n\n${pitchText}`,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Examiner Error:', error.message);
    res.status(500).json({ error: "AI Product Examiner is temporarily unavailable." });
  }
};

// --- 3. AI Startup Analyser (Auto Analysis for Investors) ---
exports.analyzeStartup = async (req, res) => {
  try {
    const { startupData } = req.body; 
    // Expecting an object like { name: "FinTechPro", industry: "FinTech", stage: "Seed", ... }
    
    const systemPrompt = `You are an automated due-diligence AI for venture capitalists. 
    Analyze the following startup data profile. 
    You must output a structured report containing:
    1. Opportunity Rating (Low, Medium, High)
    2. Risk Score (1-100)
    3. A 2-sentence investment recommendation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Startup Data: ${JSON.stringify(startupData)}`,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Analyser Error:', error.message);
    res.status(500).json({ error: "AI Startup Analyser is temporarily unavailable." });
  }
};

// --- 4. AI Team Matcher (Hackathon AI) ---
exports.matchTeam = async (req, res) => {
  try {
    const { userSkills, hackathonTheme, availableTeams } = req.body;

    const systemPrompt = `You are a Hackathon Talent Coordinator. 
    You are given a user's skills, the theme of the hackathon, and a list of teams looking for members.
    Analyze the data and recommend the TOP 2 teams the user should join based on skill gaps, 
    and explain exactly WHY they are a perfect fit.`;

    const promptData = `
    User Skills: ${userSkills}
    Hackathon Theme: ${hackathonTheme}
    Available Teams: ${JSON.stringify(availableTeams)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptData,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Matcher Error:', error.message);
    res.status(500).json({ error: "AI Team Matcher is temporarily unavailable." });
  }
};

// --- 5. AI Pitch Generator (One-Click) ---
exports.generatePitch = async (req, res) => {
  try {
    const { ideaDescription } = req.body;

    const systemPrompt = `You are an expert startup founder and storyteller. 
    Take the following raw idea description and turn it into a polished, professional 1-minute elevator pitch. 
    Structure it exactly like this:
    1. The Hook (The problem)
    2. The Solution (The product)
    3. The Traction/Market (Why now?)
    4. The Ask (What do you need from investors?)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `My raw idea: ${ideaDescription}`,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Pitch Generator Error:', error.message);
    res.status(500).json({ error: "AI Pitch Generator is temporarily unavailable." });
  }
};

// --- 6. AI Risk Scorer ---
exports.scoreRisk = async (req, res) => {
  try {
    const { startupData } = req.body;
    if (!startupData) return res.status(400).json({ error: "Startup data is required" });

    const systemPrompt = `You are a senior risk analyst specializing in early-stage startups.
    Evaluate the provided startup profile and return a structured risk assessment containing:
    1. Overall Risk Score (0-100, where 100 is highest risk)
    2. Risk Category (Low / Medium / High / Critical)
    3. Top 3 Risk Factors with a one-sentence explanation each
    4. One actionable mitigation recommendation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Startup Profile: ${JSON.stringify(startupData)}`,
      config: { systemInstruction: systemPrompt }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Risk Scorer Error:', error.message);
    res.status(500).json({ error: "AI Risk Scorer is temporarily unavailable." });
  }
};
