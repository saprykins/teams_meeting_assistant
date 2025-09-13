import { MeetingState, Suggestion, ModuleResult, AgendaItem } from '../types/meeting';

export class GoalTracker {
  private offTopicKeywords = [
    'unrelated', 'off-topic', 'side note', 'by the way',
    'this reminds me', 'speaking of', 'while we\'re on the subject',
    'just to mention', 'random thought', 'completely different'
  ];

  private topicDriftThreshold = 3; // Number of consecutive off-topic entries

  analyze(state: MeetingState): ModuleResult {
    const suggestions: Suggestion[] = [];
    const recentTranscript = state.transcript.slice(-5); // Last 5 entries
    let offTopicCount = 0;

    // Check for topic drift
    for (const entry of recentTranscript) {
      const text = entry.text.toLowerCase();
      
      if (this.isOffTopic(text, state.agenda[state.currentAgendaItem || 0])) {
        offTopicCount++;
      } else {
        offTopicCount = 0; // Reset counter if back on topic
      }
    }

    if (offTopicCount >= this.topicDriftThreshold) {
      suggestions.push({
        id: `topic_drift_${Date.now()}_${Math.random()}`,
        type: 'goal_tracking',
        title: 'Conversation Drifting Off-Topic',
        message: `The discussion has been off-topic for ${offTopicCount} consecutive statements. Consider redirecting to the current agenda item: "${state.agenda[state.currentAgendaItem || 0]?.title || 'No current agenda item'}"`,
        priority: 'medium',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }

    // Check if current agenda item is taking too long
    const currentItem = state.agenda[state.currentAgendaItem || 0];
    if (currentItem && currentItem.duration) {
      const itemStartTime = currentItem.startTime || state.startTime;
      const elapsedMinutes = (Date.now() - itemStartTime.getTime()) / (1000 * 60);
      
      if (elapsedMinutes > currentItem.duration * 1.2) { // 20% over planned duration
        suggestions.push({
          id: `time_overrun_${Date.now()}_${Math.random()}`,
          type: 'goal_tracking',
          title: 'Agenda Item Taking Too Long',
          message: `"${currentItem.title}" has exceeded its planned duration of ${currentItem.duration} minutes. Consider wrapping up or moving to the next item.`,
          priority: 'high',
          timestamp: new Date(),
          isAcknowledged: false
        });
      }
    }

    // Suggest moving to next agenda item if current is complete
    if (currentItem && this.isAgendaItemComplete(currentItem, recentTranscript)) {
      suggestions.push({
        id: `agenda_complete_${Date.now()}_${Math.random()}`,
        type: 'goal_tracking',
        title: 'Current Agenda Item Complete',
        message: `"${currentItem.title}" appears to be complete. Consider moving to the next agenda item.`,
        priority: 'low',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }

    return {
      suggestions,
      updatedState: {}
    };
  }

  private isOffTopic(text: string, currentAgendaItem?: AgendaItem): boolean {
    if (!currentAgendaItem) return false;

    const currentTopic = currentAgendaItem.title.toLowerCase();
    const currentDescription = currentAgendaItem.description?.toLowerCase() || '';
    
    // Check for off-topic keywords
    for (const keyword of this.offTopicKeywords) {
      if (text.includes(keyword)) {
        return true;
      }
    }

    // Check if text is related to current agenda item
    const topicKeywords = this.extractKeywords(currentTopic + ' ' + currentDescription);
    const textKeywords = this.extractKeywords(text);
    
    const relevanceScore = this.calculateRelevance(topicKeywords, textKeywords);
    return relevanceScore < 0.3; // Threshold for off-topic
  }

  private isAgendaItemComplete(item: AgendaItem, recentTranscript: any[]): boolean {
    // Simple heuristic: if there are completion indicators in recent transcript
    const completionPhrases = [
      'that\'s all for', 'finished with', 'done with', 'completed',
      'let\'s move on', 'next item', 'that covers', 'wrapping up'
    ];

    const recentText = recentTranscript.map(entry => entry.text.toLowerCase()).join(' ');
    return completionPhrases.some(phrase => recentText.includes(phrase));
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, you might want to use more sophisticated NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return Array.from(new Set(words)); // Remove duplicates
  }

  private calculateRelevance(topicKeywords: string[], textKeywords: string[]): number {
    if (topicKeywords.length === 0 || textKeywords.length === 0) return 0;
    
    const commonKeywords = topicKeywords.filter(keyword => 
      textKeywords.some(textKeyword => 
        textKeyword.includes(keyword) || keyword.includes(textKeyword)
      )
    );
    
    return commonKeywords.length / Math.max(topicKeywords.length, textKeywords.length);
  }
}
