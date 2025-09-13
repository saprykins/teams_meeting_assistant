import { ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, MemoryStorage, TurnContext } from "@microsoft/agents-hosting";
import { OpenAI } from "openai";
import config from "./config";
import { MeetingAssistant } from "./meetingAssistant";
import { TranscriptEntry } from "./types/meeting";

const client = new OpenAI({
  baseURL: config.githubEndpoint,
  apiKey: config.githubToken,
});

// Debug logging
console.log('GitHub endpoint:', config.githubEndpoint);
console.log('GitHub token present:', !!config.githubToken);
console.log('GitHub token length:', config.githubToken?.length || 0);

// Meeting assistant instance
let meetingAssistant: MeetingAssistant | null = null;

// Define storage and application
const storage = new MemoryStorage();
export const agentApp = new AgentApplication({
  storage,
});

agentApp.conversationUpdate("membersAdded", async (context: TurnContext) => {
  // Initialize meeting assistant when members are added
  if (!meetingAssistant) {
    const meetingId = context.activity.conversation?.id || 'default-meeting';
    const meetingTitle = 'Teams Meeting';
    const attendees = context.activity.membersAdded?.map(member => ({
      id: member.id,
      name: member.name || 'Unknown',
      email: (member as any).email || '',
      isOrganizer: false,
      isPresent: true
    })) || [];
    
    meetingAssistant = new MeetingAssistant(meetingId, meetingTitle, attendees, []);
  }
  
  await context.sendActivity(`Hi there! I'm your AI meeting assistant. I'll help guide this meeting toward clear, actionable outcomes.`);
});

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.activity(ActivityTypes.Message, async (context: TurnContext) => {
  try {
    console.log('Processing message:', context.activity.text);
    console.log('Using model:', config.githubModel);
    
    // Process with meeting assistant if available
    if (meetingAssistant) {
      const transcriptEntry: TranscriptEntry = {
        id: `transcript_${Date.now()}_${Math.random()}`,
        timestamp: new Date(),
        speaker: context.activity.from?.name || 'Unknown',
        text: context.activity.text,
        confidence: 1.0
      };
      
      const result = await meetingAssistant.processTranscript(transcriptEntry);
      
      // Send suggestions to web dashboard (if WebSocket is available)
      if (result.suggestions.length > 0) {
        console.log('Generated suggestions:', result.suggestions);
        // In a real implementation, you would send these to the web dashboard via WebSocket
      }
      
      // Generate AI response based on meeting context
      const systemPrompt = `You are an AI meeting assistant that helps guide meetings toward clear, actionable outcomes. 

Current meeting context:
- Title: ${meetingAssistant.getMeetingState().title}
- Current agenda item: ${meetingAssistant.getMeetingState().agenda[meetingAssistant.getMeetingState().currentAgendaItem || 0]?.title || 'No current agenda item'}
- Recent suggestions: ${result.suggestions.map(s => s.message).join('; ')}

Your role is to:
1. Acknowledge the speaker's input
2. Provide helpful guidance when appropriate
3. Ask clarifying questions when needed
4. Keep the meeting focused and productive

Be concise and supportive. Only respond when it adds value to the conversation.`;

      const result_llm = await client.chat.completions.create({
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
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 200
      });
      
      console.log('AI response received:', result_llm);
      
      let answer = "";
      for (const choice of result_llm.choices) {
        answer += choice.message.content;
      }
      
      if (answer.trim()) {
        await context.sendActivity(answer);
      }
    } else {
      // Fallback to basic response if meeting assistant not initialized
      const result = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an AI meeting assistant. Help guide the conversation toward clear, actionable outcomes.",
          },
          {
            role: "user",
            content: context.activity.text,
          },
        ],
        model: config.githubModel,
        temperature: 0.7,
        top_p: 0.9,
      });
      
      let answer = "";
      for (const choice of result.choices) {
        answer += choice.message.content;
      }
      await context.sendActivity(answer);
    }
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

// Export meeting assistant for external access
export { meetingAssistant };
