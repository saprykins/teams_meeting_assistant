# Azure Resource Configuration for AI Meeting Assistant

This document outlines the Azure resources and configuration needed to enable the AI Meeting Assistant to join Microsoft Teams calls and process real-time audio.

## Required Azure Resources

### 1. Bot Framework Registration

#### Bot Registration with Calls.AccessMedia.Chat Permission

1. **Navigate to Azure Portal**
   - Go to [Azure Portal](https://portal.azure.com)
   - Search for "Azure Bot"

2. **Create Bot Registration**
   - Click "Create" → "Azure Bot"
   - Choose "Multi Tenant" for tenant type
   - Select "Microsoft App ID" for authentication
   - Choose "User-assigned managed identity" for identity

3. **Configure Bot Permissions**
   - In the Bot Service, go to "Configuration"
   - Add the following Microsoft Graph permissions:
     - `Calls.AccessMedia.Chat` - Required for joining Teams calls
     - `Calls.JoinGroupCall.All` - Required for joining group calls
     - `Calls.JoinGroupCallAsGuest.All` - Required for guest access
     - `Calls.Initiate.All` - Required for initiating calls
     - `Calls.AccessMedia.All` - Required for media access

4. **Generate Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Set expiration (recommend 24 months)
   - Copy the secret value immediately

### 2. Azure Speech Service

#### Create Speech Service Resource

1. **Create Speech Service**
   - Go to Azure Portal
   - Search for "Speech Services"
   - Click "Create"
   - Choose "Speech Services" resource type
   - Select your subscription and resource group
   - Choose "Free (F0)" tier for development
   - Choose "Standard (S0)" tier for production

2. **Configure Speech Service**
   - Note the "Key" and "Region" from the resource
   - These will be used for real-time Speech-to-Text

#### Speech Service Configuration

```bash
# Environment variables needed
AZURE_SPEECH_KEY=your_speech_service_key
AZURE_SPEECH_REGION=your_speech_service_region
```

### 3. Microsoft Graph API Configuration

#### App Registration for Graph API

1. **Register Application**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to "Azure Active Directory" → "App registrations"
   - Click "New registration"
   - Name: "AI Meeting Assistant"
   - Supported account types: "Accounts in any organizational directory"
   - Redirect URI: "Web" → `https://your-bot-url.com/auth/callback`

2. **API Permissions**
   - Go to "API permissions" → "Add a permission"
   - Select "Microsoft Graph"
   - Add the following permissions:
     - `Calls.AccessMedia.Chat` (Application)
     - `Calls.JoinGroupCall.All` (Application)
     - `Calls.JoinGroupCallAsGuest.All` (Application)
     - `Calls.Initiate.All` (Application)
     - `Calls.AccessMedia.All` (Application)
     - `User.Read` (Delegated)
     - `Chat.Read` (Delegated)
     - `Chat.ReadWrite` (Delegated)

3. **Grant Admin Consent**
   - Click "Grant admin consent for [Your Organization]"
   - This is required for application permissions

4. **Generate Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Copy the secret value

### 4. Azure App Service Configuration

#### Update App Service Settings

Add the following environment variables to your Azure App Service:

```bash
# Bot Framework
BOT_ID=your_bot_app_id
SECRET_BOT_PASSWORD=your_bot_client_secret
BOT_ENDPOINT=https://your-app-service.azurewebsites.net

# Microsoft Graph
GRAPH_TENANT_ID=your_tenant_id
GRAPH_CLIENT_ID=your_graph_app_id
GRAPH_CLIENT_SECRET=your_graph_client_secret

# Azure Speech Service
AZURE_SPEECH_KEY=your_speech_service_key
AZURE_SPEECH_REGION=your_speech_service_region

# GitHub Models (already configured)
GITHUB_TOKEN=your_github_token
```

### 5. Teams App Manifest Configuration

#### Update Teams App Manifest

Update your `appPackage/manifest.json` to include the necessary permissions:

```json
{
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": [
    "your-app-service.azurewebsites.net"
  ],
  "webApplicationInfo": {
    "id": "your-bot-app-id",
    "resource": "https://RscBasedStoreApp"
  }
}
```

## Implementation Steps

### 1. Install Required Dependencies

```bash
npm install @azure/cognitiveservices-speech @microsoft/microsoft-graph-client
npm install --save-dev @types/ws
```

### 2. Update Bot Registration

1. **Configure Messaging Endpoint**
   - Set messaging endpoint to: `https://your-app-service.azurewebsites.net/api/messages`

2. **Enable Calling**
   - In Bot Framework portal, go to "Channels"
   - Click on "Microsoft Teams"
   - Enable "Calling" feature
   - Set calling webhook to: `https://your-app-service.azurewebsites.net/api/calling`

### 3. Configure Teams App

1. **Upload App Package**
   - Use Teams Toolkit to package and upload your app
   - Or manually upload the app package to Teams Admin Center

2. **Enable App Permissions**
   - In Teams Admin Center, go to "Teams apps" → "Manage apps"
   - Find your app and click "Settings"
   - Enable "Allow app to join meetings"

## Audio Processing Implementation

### Real-time Speech-to-Text

The bot will need to:

1. **Join Teams Calls**
   - Use Microsoft Graph API to join calls
   - Request media access permissions

2. **Process Audio Streams**
   - Receive 20ms audio frames
   - Send to Azure Speech Service for real-time STT
   - Process transcript in real-time

3. **Generate Suggestions**
   - Use the specialized modules to analyze transcript
   - Send suggestions to web dashboard via WebSocket

### Code Implementation

```typescript
// Example audio processing setup
import { SpeechConfig, AudioConfig, SpeechRecognizer } from '@azure/cognitiveservices-speech';

const speechConfig = SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY!,
  process.env.AZURE_SPEECH_REGION!
);

const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

recognizer.recognizeOnceAsync(
  (result) => {
    // Process transcript
    console.log(`Recognized: ${result.text}`);
  },
  (err) => {
    console.error(`Error: ${err}`);
  }
);
```

## Security Considerations

### 1. Authentication
- Use managed identity where possible
- Store secrets in Azure Key Vault
- Implement proper token refresh logic

### 2. Data Privacy
- Ensure compliance with data protection regulations
- Implement data retention policies
- Consider data residency requirements

### 3. Network Security
- Use HTTPS for all endpoints
- Implement proper CORS policies
- Consider using Azure Application Gateway for additional security

## Monitoring and Logging

### 1. Application Insights
- Enable Application Insights for monitoring
- Track bot performance and errors
- Monitor WebSocket connections

### 2. Logging
- Implement structured logging
- Log all audio processing activities
- Track meeting analytics

## Troubleshooting

### Common Issues

1. **Bot Not Joining Calls**
   - Check bot permissions in Azure AD
   - Verify calling webhook configuration
   - Check Teams app permissions

2. **Audio Processing Issues**
   - Verify Speech Service configuration
   - Check audio format compatibility
   - Monitor Speech Service quotas

3. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify WebSocket protocol support
   - Monitor connection timeouts

### Debug Steps

1. Check Azure App Service logs
2. Verify environment variables
3. Test API permissions
4. Monitor network traffic
5. Check Teams app status

## Cost Considerations

### Azure Speech Service
- Free tier: 5 hours per month
- Standard tier: $1.00 per hour
- Consider usage patterns for cost optimization

### Bot Framework
- No additional cost for basic functionality
- Premium features may have additional costs

### App Service
- Based on your current App Service plan
- Consider scaling based on usage

## Next Steps

1. Set up the Azure resources as described above
2. Update your bot code with the audio processing capabilities
3. Test the integration in a development environment
4. Deploy to production with proper monitoring
5. Train users on the new meeting assistant features

For more detailed implementation guidance, refer to the Microsoft documentation for Bot Framework, Teams, and Speech Services.
