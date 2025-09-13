import { ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, MemoryStorage, TurnContext } from "@microsoft/agents-hosting";
import { OpenAI } from "openai";
import config from "./config";

const client = new OpenAI({
  baseURL: config.githubEndpoint,
  apiKey: config.githubToken,
});

// Debug logging
console.log('GitHub endpoint:', config.githubEndpoint);
console.log('GitHub token present:', !!config.githubToken);
console.log('GitHub token length:', config.githubToken?.length || 0);
const systemPrompt = "You are an AI agent that can chat with users.";

// Define storage and application
const storage = new MemoryStorage();
export const agentApp = new AgentApplication({
  storage,
});

agentApp.conversationUpdate("membersAdded", async (context: TurnContext) => {
  await context.sendActivity(`Hi there! I'm an agent to chat with you.`);
});

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.activity(ActivityTypes.Message, async (context: TurnContext) => {
  try {
    console.log('Processing message:', context.activity.text);
    console.log('Using model:', config.githubModel);
    
    // Echo back users request
    const result = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: context.activity.text,
        },
      ],
      model: config.githubModel,
      temperature: 1,
      top_p: 1,
    });
    
    console.log('API response received:', result);
    
    let answer = "";
    for (const choice of result.choices) {
      answer += choice.message.content;
    }
    await context.sendActivity(answer);
  } catch (error) {
    console.error('Error in message processing:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      response: error.response?.data
    });
    
    await context.sendActivity(`Error: ${error.message}`);
  }
});
