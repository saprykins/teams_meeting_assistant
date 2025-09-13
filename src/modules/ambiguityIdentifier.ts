import { MeetingState, Suggestion, ModuleResult } from '../types/meeting';

export class AmbiguityIdentifier {
  private ambiguousPhrases = [
    'we\'ll handle that',
    'sometime next week',
    'we should look into',
    'someone needs to',
    'we\'ll figure it out',
    'let\'s discuss later',
    'we\'ll get back to you',
    'we\'ll see',
    'maybe we can',
    'we might want to',
    'it would be good to',
    'we should probably',
    'we need to think about',
    'we\'ll work on it',
    'we\'ll take care of it'
  ];

  private vagueTimePhrases = [
    'soon',
    'eventually',
    'when we get a chance',
    'in the near future',
    'asap',
    'when possible',
    'at some point',
    'down the road',
    'in due time'
  ];

  analyze(state: MeetingState): ModuleResult {
    const suggestions: Suggestion[] = [];
    const recentTranscript = state.transcript.slice(-10); // Last 10 entries

    for (const entry of recentTranscript) {
      const text = entry.text.toLowerCase();
      
      // Check for ambiguous phrases
      for (const phrase of this.ambiguousPhrases) {
        if (text.includes(phrase)) {
          suggestions.push({
            id: `ambiguity_${Date.now()}_${Math.random()}`,
            type: 'ambiguity',
            title: 'Ambiguous Statement Detected',
            message: `"${entry.text}" - This statement lacks specificity. Consider asking: Who will handle this? What exactly needs to be done? When should it be completed?`,
            priority: 'medium',
            timestamp: new Date(),
            isAcknowledged: false
          });
        }
      }

      // Check for vague time references
      for (const phrase of this.vagueTimePhrases) {
        if (text.includes(phrase)) {
          suggestions.push({
            id: `time_ambiguity_${Date.now()}_${Math.random()}`,
            type: 'ambiguity',
            title: 'Vague Timeline Detected',
            message: `"${entry.text}" - This timeline is unclear. Consider asking for a specific date or deadline.`,
            priority: 'high',
            timestamp: new Date(),
            isAcknowledged: false
          });
        }
      }

      // Check for missing assignees
      if (this.containsActionWords(text) && !this.hasAssignee(text)) {
        suggestions.push({
          id: `missing_assignee_${Date.now()}_${Math.random()}`,
          type: 'ambiguity',
          title: 'Missing Assignee',
          message: `"${entry.text}" - This appears to be an action item but lacks a clear assignee. Who should be responsible for this task?`,
          priority: 'high',
          timestamp: new Date(),
          isAcknowledged: false
        });
      }
    }

    return {
      suggestions,
      updatedState: {}
    };
  }

  private containsActionWords(text: string): boolean {
    const actionWords = [
      'need to', 'should', 'must', 'have to', 'will', 'going to',
      'implement', 'create', 'build', 'develop', 'fix', 'update',
      'review', 'analyze', 'investigate', 'research', 'prepare',
      'send', 'schedule', 'organize', 'plan', 'coordinate'
    ];
    
    return actionWords.some(word => text.includes(word));
  }

  private hasAssignee(text: string): boolean {
    const assigneeIndicators = [
      'i will', 'i\'ll', 'i can', 'i should',
      'john will', 'sarah will', 'the team will',
      'marketing will', 'engineering will', 'sales will',
      'assigned to', 'responsible for', 'owner is'
    ];
    
    return assigneeIndicators.some(indicator => text.toLowerCase().includes(indicator));
  }
}
