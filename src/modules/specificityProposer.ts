import { MeetingState, Suggestion, ModuleResult } from '../types/meeting';

export class SpecificityProposer {
  private weakVerbs = [
    'look into', 'check out', 'think about', 'consider', 'explore',
    'investigate', 'review', 'analyze', 'examine', 'study'
  ];

  private strongVerbs = [
    'implement', 'create', 'build', 'develop', 'fix', 'update',
    'schedule', 'organize', 'coordinate', 'present', 'deliver',
    'complete', 'finish', 'launch', 'deploy', 'execute'
  ];

  analyze(state: MeetingState): ModuleResult {
    const suggestions: Suggestion[] = [];
    const recentTranscript = state.transcript.slice(-3); // Last 3 entries

    for (const entry of recentTranscript) {
      const text = entry.text;
      
      // Check for weak verbs that need strengthening
      const weakVerbSuggestions = this.identifyWeakVerbs(text);
      suggestions.push(...weakVerbSuggestions);
      
      // Check for missing specifics
      const specificitySuggestions = this.identifyMissingSpecifics(text);
      suggestions.push(...specificitySuggestions);
      
      // Check for unclear scope
      const scopeSuggestions = this.identifyUnclearScope(text);
      suggestions.push(...scopeSuggestions);
    }

    return {
      suggestions,
      updatedState: {}
    };
  }

  private identifyWeakVerbs(text: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const lowerText = text.toLowerCase();
    
    for (const weakVerb of this.weakVerbs) {
      if (lowerText.includes(weakVerb)) {
        const strongAlternatives = this.getStrongAlternatives(weakVerb);
        
        suggestions.push({
          id: `weak_verb_${Date.now()}_${Math.random()}`,
          type: 'specificity',
          title: 'Weak Action Verb Detected',
          message: `"${weakVerb}" is vague. Consider using more specific verbs like: ${strongAlternatives.join(', ')}. This will make the task more actionable.`,
          priority: 'medium',
          timestamp: new Date(),
          isAcknowledged: false
        });
      }
    }
    
    return suggestions;
  }

  private identifyMissingSpecifics(text: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const lowerText = text.toLowerCase();
    
    // Check for missing deadlines
    if (this.containsActionWords(lowerText) && !this.hasDeadline(lowerText)) {
      suggestions.push({
        id: `missing_deadline_${Date.now()}_${Math.random()}`,
        type: 'specificity',
        title: 'Missing Deadline',
        message: 'This task lacks a specific deadline. Consider asking: "When should this be completed?" or "What\'s the target date?"',
        priority: 'high',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }
    
    // Check for missing success criteria
    if (this.containsActionWords(lowerText) && !this.hasSuccessCriteria(lowerText)) {
      suggestions.push({
        id: `missing_criteria_${Date.now()}_${Math.random()}`,
        type: 'specificity',
        title: 'Missing Success Criteria',
        message: 'This task lacks clear success criteria. Consider asking: "How will we know when this is complete?" or "What does success look like?"',
        priority: 'medium',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }
    
    // Check for missing resources
    if (this.containsActionWords(lowerText) && !this.hasResources(lowerText)) {
      suggestions.push({
        id: `missing_resources_${Date.now()}_${Math.random()}`,
        type: 'specificity',
        title: 'Missing Resource Information',
        message: 'This task lacks resource information. Consider asking: "What resources are needed?" or "Who can provide support?"',
        priority: 'low',
        timestamp: new Date(),
        isAcknowledged: false
      });
    }
    
    return suggestions;
  }

  private identifyUnclearScope(text: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const lowerText = text.toLowerCase();
    
    // Check for vague scope indicators
    const vagueScopePhrases = [
      'some of', 'a few', 'several', 'various', 'multiple',
      'all the', 'everything', 'anything', 'whatever'
    ];
    
    for (const phrase of vagueScopePhrases) {
      if (lowerText.includes(phrase)) {
        suggestions.push({
          id: `unclear_scope_${Date.now()}_${Math.random()}`,
          type: 'specificity',
          title: 'Unclear Scope',
          message: `"${phrase}" is vague. Consider being more specific about what exactly needs to be done.`,
          priority: 'medium',
          timestamp: new Date(),
          isAcknowledged: false
        });
      }
    }
    
    return suggestions;
  }

  private getStrongAlternatives(weakVerb: string): string[] {
    const alternatives: { [key: string]: string[] } = {
      'look into': ['investigate', 'research', 'analyze', 'examine'],
      'check out': ['review', 'evaluate', 'assess', 'audit'],
      'think about': ['decide', 'determine', 'resolve', 'conclude'],
      'consider': ['evaluate', 'assess', 'decide', 'choose'],
      'explore': ['investigate', 'research', 'analyze', 'examine'],
      'investigate': ['research', 'analyze', 'examine', 'audit'],
      'review': ['evaluate', 'assess', 'audit', 'analyze'],
      'analyze': ['examine', 'evaluate', 'assess', 'audit'],
      'examine': ['analyze', 'evaluate', 'assess', 'audit'],
      'study': ['research', 'analyze', 'examine', 'investigate']
    };
    
    return alternatives[weakVerb] || [];
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

  private hasDeadline(text: string): boolean {
    const deadlineIndicators = [
      'by', 'before', 'until', 'due', 'deadline', 'target',
      'next week', 'tomorrow', 'friday', 'monday', 'end of',
      'asap', 'urgent', 'immediately'
    ];
    
    return deadlineIndicators.some(indicator => text.includes(indicator));
  }

  private hasSuccessCriteria(text: string): boolean {
    const criteriaIndicators = [
      'complete', 'finished', 'done', 'delivered', 'launched',
      'working', 'functional', 'tested', 'approved', 'validated',
      'successful', 'effective', 'meets requirements'
    ];
    
    return criteriaIndicators.some(indicator => text.includes(indicator));
  }

  private hasResources(text: string): boolean {
    const resourceIndicators = [
      'budget', 'funding', 'team', 'staff', 'tools', 'software',
      'equipment', 'materials', 'support', 'help', 'assistance',
      'resources', 'time', 'personnel', 'technology'
    ];
    
    return resourceIndicators.some(indicator => text.includes(indicator));
  }
}
