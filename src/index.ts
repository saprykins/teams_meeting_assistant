// Import required packages
import {
  AuthConfiguration,
  authorizeJWT,
  loadAuthConfigFromEnv,
  Request,
} from "@microsoft/agents-hosting";
import express, { Response } from "express";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

// This bot's adapter
import adapter from "./adapter";

// This bot's main dialog.
import { agentApp, meetingAssistant } from "./agent";

// Create authentication configuration
const authConfig: AuthConfiguration = loadAuthConfigFromEnv();

// Create express application.
const expressApp = express();
expressApp.use(express.json());

// Serve static files for the web dashboard (before JWT auth)
expressApp.use(express.static(path.join(__dirname, '../public')));

// Apply JWT authentication only to API routes
expressApp.use('/api', authorizeJWT(authConfig));

// Create HTTP server
const server = createServer(expressApp);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store WebSocket connections for broadcasting
const wsConnections = new Set<WebSocket>();

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  wsConnections.add(ws);
  
  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received WebSocket message:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'get_meeting_state':
          if (meetingAssistant) {
            ws.send(JSON.stringify({
              type: 'meeting_state',
              state: meetingAssistant.getMeetingState()
            }));
          }
          break;
        case 'acknowledge_suggestion':
          if (meetingAssistant) {
            meetingAssistant.acknowledgeSuggestion(data.suggestionId);
          }
          break;
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsConnections.delete(ws);
  });
});

// Function to broadcast to all connected clients
function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Serve the web dashboard
expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Listen for incoming requests (Bot Framework webhook - requires auth)
expressApp.post("/api/messages", async (req: Request, res: Response) => {
  await adapter.process(req, res, async (context) => {
    await agentApp.run(context);
  });
});

// API endpoint to get meeting state
expressApp.get('/api/meeting-state', (req, res) => {
  if (meetingAssistant) {
    res.json(meetingAssistant.getMeetingState());
  } else {
    res.status(404).json({ error: 'No active meeting' });
  }
});

// API endpoint to generate meeting summary
expressApp.get('/api/meeting-summary', async (req, res) => {
  if (meetingAssistant) {
    try {
      const summary = await meetingAssistant.generateMeetingSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  } else {
    res.status(404).json({ error: 'No active meeting' });
  }
});

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nAgent started, ${expressApp.name} listening to`, server.address());
  console.log('Web dashboard available at: http://localhost:3978');
});

// Export the broadcast function for use in other modules
export { broadcastToClients };
