import { OpenAI } from "openai";
import { MeetingState, Suggestion, ModuleResult, TranscriptEntry, Decision, ActionItem } from './types/meeting';
import { AmbiguityIdentifier } from './modules/ambiguityIdentifier';
import { GoalTracker } from './modules/goalTracker';
import { ActionItemExtractor } from './modules/actionItemExtractor';
import { SpecificityProposer } from './modules/specificityProposer';
import { FinalizationRecommender } from './modules/finalizationRecommender';
import config from './config';

export class MeetingAssistant {
  private client: OpenAI;
  private meetingState: MeetingState;
  private modules: {
    ambiguityIdentifier: AmbiguityIdentifier;
    goalTracker: GoalTracker;
    actionItemExtractor: ActionItemExtractor;
    specificityProposer: SpecificityProposer;
    finalizationRecommender: FinalizationRecommender;
  };

  constructor(meetingId: string, title: string, attendees: any[], agenda: any[]) {
    this.client = new OpenAI({
      baseURL: config.githubEndpoint,
      apiKey: config.githubToken,
    });

    this.meetingState = {
      id: meetingId,
      title,
      startTime: new Date(),
      attendees,
      agenda,
      currentAgendaItem: 0,
      transcript: [],
      decisions: [],
      actionItems: [],
      suggestions: [],
      isActive: true
    };

    this.modules = {
      ambiguityIdentifier: new AmbiguityIdentifier(),
      goalTracker: new GoalTracker(),
      actionItemExtractor: new ActionItemExtractor(),
      specificityProposer: new SpecificityProposer(),
      finalizationRecommender: new FinalizationRecommender()
    };
  }

  async processTranscript(transcriptEntry: TranscriptEntry): Promise<{
    suggestions: Suggestion[];
    updatedState: MeetingState;
  }> {
    // Add new transcript entry
    this.meetingState.transcript.push(transcriptEntry);

    // Run all modules
    const moduleResults: ModuleResult[] = [];
    
    try {
      moduleResults.push(this.modules.ambiguityIdentifier.analyze(this.meetingState));
      moduleResults.push(this.modules.goalTracker.analyze(this.meetingState));
      moduleResults.push(this.modules.actionItemExtractor.analyze(this.meetingState));
      moduleResults.push(this.modules.specificityProposer.analyze(this.meetingState));
      moduleResults.push(this.modules.finalizationRecommender.analyze(this.meetingState));
    } catch (error) {
      console.error('Error running modules:', error);
    }

    // Consolidate results
    const allSuggestions: Suggestion[] = [];
    const updatedState = { ...this.meetingState };

    for (const result of moduleResults) {
      allSuggestions.push(...result.suggestions);
      Object.assign(updatedState, result.updatedState);
    }

    // Add suggestions to state
    updatedState.suggestions = [...this.meetingState.suggestions, ...allSuggestions];

    // Update current state
    this.meetingState = updatedState;

    // Generate AI-powered insights using the main LLM
    const aiInsights = await this.generateAIInsights(transcriptEntry, allSuggestions);

    return {
      suggestions: [...allSuggestions, ...aiInsights],
      updatedState: this.meetingState
    };
  }

  private async generateAIInsights(transcriptEntry: TranscriptEntry, moduleSuggestions: Suggestion[]): Promise<Suggestion[]> {
    try {
      const systemPrompt = `You are an AI meeting assistant that helps meeting organizers guide conversations toward clear, actionable outcomes. 

Current meeting context:
- Title: ${this.meetingState.title}
- Current agenda item: ${this.meetingState.agenda[this.meetingState.currentAgendaItem || 0]?.title || 'No current agenda item'}
- Recent transcript: ${this.meetingState.transcript.slice(-3).map(t => `${t.speaker}: ${t.text}`).join('\n')}
- Current decisions: ${this.meetingState.decisions.map(d => d.title).join(', ')}
- Current action items: ${this.meetingState.actionItems.map(a => a.task).join(', ')}

Your role is to provide direct, actionable suggestions to the meeting organizer to help them:
1. Keep the meeting focused and productive
2. Ensure clear decisions and action items
3. Guide the conversation toward specific outcomes
4. Maintain meeting momentum

Be direct and assertive in your suggestions. The organizer can see these suggestions privately.`;

      const userPrompt = `New transcript entry: "${transcriptEntry.speaker}: ${transcriptEntry.text}"

Module suggestions: ${moduleSuggestions.map(s => `- ${s.title}: ${s.message}`).join('\n')}

Based on this new information, provide 1-2 direct, actionable suggestions for the meeting organizer. Focus on the most important issues that need immediate attention.`;

      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: config.githubModel,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500
      });

      const aiResponse = response.choices[0]?.message?.content || '';
      
      if (aiResponse.trim()) {
        return [{
          id: `ai_insight_${Date.now()}_${Math.random()}`,
          type: 'ai_insight',
          title: 'AI Meeting Insight',
          message: aiResponse,
          priority: 'high',
          timestamp: new Date(),
          isAcknowledged: false
        }];
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
    }

    return [];
  }

  async generateMeetingSummary(): Promise<any> {
    const endTime = new Date();
    const duration = (endTime.getTime() - this.meetingState.startTime.getTime()) / (1000 * 60); // in minutes

    const systemPrompt = `You are an AI meeting assistant that generates comprehensive meeting summaries. 

Meeting details:
- Title: ${this.meetingState.title}
- Duration: ${Math.round(duration)} minutes
- Attendees: ${this.meetingState.attendees.map(a => a.name).join(', ')}
- Agenda: ${this.meetingState.agenda.map(a => a.title).join(', ')}
- Full transcript: ${this.meetingState.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')}
- Decisions made: ${this.meetingState.decisions.map(d => d.title).join(', ')}
- Action items: ${this.meetingState.actionItems.map(a => `${a.task} (${a.assignees.join(', ')})`).join(', ')}

Generate a professional meeting summary that includes:
1. Meeting header with title, date, time, attendees
2. Meeting purpose and objectives
3. Key decisions made
4. Action items with assignees and deadlines
5. Next steps and follow-up items

Format the output as a structured document.`;

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the meeting summary." }
        ],
        model: config.githubModel,
        temperature: 0.3,
        top_p: 0.8,
        max_tokens: 2000
      });

      return {
        title: this.meetingState.title,
        date: this.meetingState.startTime,
        duration: Math.round(duration),
        attendees: this.meetingState.attendees,
        absentees: this.meetingState.attendees.filter(a => !a.isPresent),
        summary: response.choices[0]?.message?.content || 'Unable to generate summary',
        decisions: this.meetingState.decisions,
        actionItems: this.meetingState.actionItems
      };
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      return {
        title: this.meetingState.title,
        date: this.meetingState.startTime,
        duration: Math.round(duration),
        attendees: this.meetingState.attendees,
        absentees: this.meetingState.attendees.filter(a => !a.isPresent),
        summary: 'Error generating summary',
        decisions: this.meetingState.decisions,
        actionItems: this.meetingState.actionItems
      };
    }
  }

  getMeetingState(): MeetingState {
    return this.meetingState;
  }

  updateAgendaItem(index: number): void {
    this.meetingState.currentAgendaItem = index;
  }

  addDecision(decision: Decision): void {
    this.meetingState.decisions.push(decision);
  }

  updateActionItem(actionItemId: string, updates: Partial<ActionItem>): void {
    const index = this.meetingState.actionItems.findIndex(a => a.id === actionItemId);
    if (index !== -1) {
      this.meetingState.actionItems[index] = { ...this.meetingState.actionItems[index], ...updates };
    }
  }

  acknowledgeSuggestion(suggestionId: string): void {
    const suggestion = this.meetingState.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.isAcknowledged = true;
    }
  }
}
