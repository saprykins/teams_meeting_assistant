import { MeetingState, Suggestion, ModuleResult } from '../types/meeting';

export class FinalizationRecommender {
  private meetingEndThreshold = 0.8; // 80% of planned duration
  private finalizationKeywords = [
    'wrapping up', 'finishing', 'concluding', 'ending',
    'last thing', 'final point', 'before we go', 'closing'
  ];

  analyze(state: MeetingState): ModuleResult {
    const suggestions: Suggestion[] = [];
    
    // Check if meeting is nearing its end
    if (this.isMeetingNearingEnd(state)) {
      suggestions.push(...this.generateFinalizationSuggestions(state));
    }
    
    // Check for meeting conclusion signals
    if (this.hasConclusionSignals(state)) {
      suggestions.push(...this.generateConclusionSuggestions(state));
    }
    
    return {
      suggestions,
      updatedState: {}
    };
  }

  private isMeetingNearingEnd(state: MeetingState): boolean {
    if (!state.endTime) return false;
    
    const now = new Date();
    const totalDuration = state.endTime.getTime() - state.startTime.getTime();
    const elapsed = now.getTime() - state.startTime.getTime();
    const progress = elapsed / totalDuration;
    
    return progress >= this.meetingEndThreshold;
  }

  private hasConclusionSignals(state: MeetingState): boolean {
    const recentTranscript = state.transcript.slice(-3);
    const recentText = recentTranscript.map(entry => entry.text.toLowerCase()).join(' ');
    
    return this.finalizationKeywords.some(keyword => recentText.includes(keyword));
  }

  private generateFinalizationSuggestions(state: MeetingState): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Check for unverified decisions
    const unverifiedDecisions = state.decisions.filter(d => !d.isVerified);
    if (unverifiedDecisions.length > 0) {
      suggestions.push({
        id: `verify_decisions_${Date.now()}_${Math.random()}`,
        type: 'finalization',
        title: 'Verify Decisions',
        message: `You have ${unverifiedDecisions.length} unverified decisions. Consider asking: "Let's confirm our decisions: ${unverifiedDecisions.map(d => d.title).join(', ')}"`,
        priority: 'high',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }
    
    // Check for unverified action items
    const unverifiedActions = state.actionItems.filter(a => !a.isVerified);
    if (unverifiedActions.length > 0) {
      suggestions.push({
        id: `verify_actions_${Date.now()}_${Math.random()}`,
        type: 'finalization',
        title: 'Verify Action Items',
        message: `You have ${unverifiedActions.length} unverified action items. Consider asking: "Let's confirm our action items: ${unverifiedActions.map(a => a.task).join(', ')}"`,
        priority: 'high',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }
    
    // Check for incomplete agenda items
    const incompleteItems = state.agenda.filter(item => !item.isCompleted);
    if (incompleteItems.length > 0) {
      suggestions.push({
        id: `incomplete_agenda_${Date.now()}_${Math.random()}`,
        type: 'finalization',
        title: 'Incomplete Agenda Items',
        message: `You have ${incompleteItems.length} incomplete agenda items: ${incompleteItems.map(item => item.title).join(', ')}. Consider prioritizing or rescheduling.`,
        priority: 'medium',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }
    
    // Suggest next steps
    suggestions.push({
      id: `next_steps_${Date.now()}_${Math.random()}`,
      type: 'finalization',
      title: 'Plan Next Steps',
      message: 'Consider asking: "What are our next steps?" or "What should we focus on before our next meeting?"',
      priority: 'medium',
      timestamp: new Date(),
      isAcknowledged: false
    });
    
    return suggestions;
  }

  private generateConclusionSuggestions(state: MeetingState): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Suggest summary
    suggestions.push({
      id: `meeting_summary_${Date.now()}_${Math.random()}`,
      type: 'finalization',
      title: 'Provide Meeting Summary',
      message: 'Consider summarizing: "To recap, we decided on [decisions] and will take action on [action items]. Our next steps are [next steps]."',
      priority: 'high',
      timestamp: new Date(),
      isAcknowledged: false
    });
    
    // Suggest follow-up
    suggestions.push({
      id: `follow_up_${Date.now()}_${Math.random()}`,
      type: 'finalization',
      title: 'Schedule Follow-up',
      message: 'Consider asking: "When should we meet again to review progress?" or "Who will send out the meeting summary?"',
      priority: 'medium',
      timestamp: new Date(),
      isAcknowledged: false
    });
    
    return suggestions;
  }
}
