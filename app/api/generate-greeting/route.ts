export async function POST(req: Request) {
  try {
    const { userName, role, time } = await req.json()

    const prompt = `Generate a brief, professional and warm greeting for a ${role} user named ${userName}. 
The current time period is ${time}. 
Keep it to 1-2 sentences, personalized and encouraging for dashboard usage. 
Include a relevant insight or tip related to their role.`

    // OpenRouter API configuration
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
    const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const SITE_NAME = "Memosphere Dashboard";

    if (!OPENROUTER_API_KEY) {
      return getFallbackGreeting(userName, role, time);
    }

    // Call OpenRouter API with DeepSeek model
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "deepseek/deepseek-r1-0528:free",
        "messages": [
          {
            "role": "system",
            "content": "You are a professional assistant that generates warm, personalized greetings for dashboard users. Keep responses to 1-2 sentences, be encouraging and include role-specific insights."
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.7,
        "max_tokens": 150
      })
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", response.status, response.statusText);
      return getFallbackGreeting(userName, role, time);
    }

    const data = await response.json();
    const greeting = data.choices?.[0]?.message?.content || getFallbackGreetingText(userName, role, time);

    return Response.json({ 
      greeting: greeting.trim(),
      source: "deepseek",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error generating greeting:", error);
    // Fallback greeting in case of error - extract data again if needed
    try {
      const { userName, role, time } = await req.json();
      return getFallbackGreeting(userName, role, time);
    } catch {
      return getFallbackGreeting("User", "user", "day");
    }
  }
}

function getFallbackGreeting(userName: string, role: string, time: string) {
  const greeting = getFallbackGreetingText(userName, role, time);
  return Response.json({ 
    greeting,
    source: "fallback",
    timestamp: new Date().toISOString()
  });
}

function getFallbackGreetingText(userName: string, role: string, time: string): string {
  const fallbackGreetings = {
    admin: [
      `Good ${time}, ${userName}! Your systems are running smoothly - perfect time to focus on strategic improvements.`,
      `Welcome back, ${userName}! Ready to optimize operations and ensure everything stays secure this ${time}?`,
      `Hello ${userName}! Your admin dashboard shows all systems green - time to innovate and improve processes.`
    ],
    manager: [
      `Hello ${userName}! Ready to lead your team to success this ${time}. Your leadership dashboard awaits your strategic decisions.`,
      `Good ${time}, ${userName}! Your team's performance metrics look promising - time to celebrate wins and plan ahead.`,
      `Welcome ${userName}! This ${time} brings new opportunities to inspire and guide your team to excellence.`
    ],
    user: [
      `Welcome back, ${userName}! Hope you're having a productive ${time}. Your personalized dashboard is ready with fresh insights.`,
      `Good ${time}, ${userName}! Ready to tackle your goals with focus and determination today?`,
      `Hello ${userName}! Your dashboard shows great progress this week - keep up the excellent momentum this ${time}!`
    ]
  };
  
  const roleGreetings = fallbackGreetings[role as keyof typeof fallbackGreetings] || fallbackGreetings.user;
  const randomIndex = Math.floor(Math.random() * roleGreetings.length);
  
  return roleGreetings[randomIndex] || `Hello ${userName}! Welcome to your dashboard this ${time}. Ready to be productive?`;
}
