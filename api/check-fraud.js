// This runs on Vercel's server, NOT in the browser — your API key stays hidden here.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { amount, merchant, location, time, history } = req.body;

  const historyText = history.map(t =>
    `- ₹${t.amount} at ${t.merchant}, ${t.location}, ${t.time}`
  ).join("\n");

  const prompt = `You are a fraud detection assistant for a bank. You will compare a NEW transaction against this user's PAST transaction history to judge if the new one is unusual for THIS specific user.

PAST TRANSACTION HISTORY (this user's normal behavior):
${historyText}

NEW TRANSACTION TO CHECK:
- Amount: ₹${amount}
- Merchant: ${merchant}
- Location: ${location}
- Time: ${time}

Compare the new transaction against the pattern in the history (typical amount range, typical locations, typical times, typical merchants). Decide if it looks suspicious FOR THIS USER specifically, not in general.

Respond in EXACTLY this format, nothing else:
RISK: [Low/Medium/High]
REASON: [one or two sentence explanation that specifically references how this differs from or matches the user's past pattern]`;

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await groqResponse.json();

    if (data.choices && data.choices[0]) {
      return res.status(200).json({ text: data.choices[0].message.content });
    } else {
      return res.status(500).json({ error: "AI did not return a valid response", details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
