import { MeetingState, Suggestion, ModuleResult, ActionItem } from '../types/meeting';

export class ActionItemExtractor {
  private actionVerbs = [
    'implement', 'create', 'build', 'develop', 'fix', 'update', 'modify',
    'review', 'analyze', 'investigate', 'research', 'prepare', 'organize',
    'send', 'schedule', 'coordinate', 'plan', 'design', 'test', 'deploy',
    'write', 'document', 'present', 'meet', 'call', 'email', 'follow up'
  ];

  private assigneePatterns = [
    /(?:i will|i'll|i can|i should)/i,
    /(?:(\w+)\s+will)/i,
    /(?:(\w+)\s+should)/i,
    /(?:(\w+)\s+needs to)/i,
    /(?:assigned to\s+(\w+))/i,
    /(?:(\w+)\s+is responsible)/i,
    /(?:(\w+)\s+will handle)/i
  ];

  private deadlinePatterns = [
    /(?:by|before|until)\s+(\w+\s+\d+)/i,
    /(?:due|deadline)\s+(?:on|by)\s+(\w+\s+\d+)/i,
    /(?:next\s+)(\w+day|week|month)/i,
    /(?:this\s+)(\w+day|week|month)/i,
    /(?:in\s+)(\d+)\s+(?:days?|weeks?|months?)/i
  ];

  analyze(state: MeetingState): ModuleResult {
    const suggestions: Suggestion[] = [];
    const recentTranscript = state.transcript.slice(-5); // Last 5 entries
    const newActionItems: ActionItem[] = [];

    for (const entry of recentTranscript) {
      const actionItems = this.extractActionItems(entry, state.attendees);
      
      for (const actionItem of actionItems) {
        // Check if this action item already exists
        const exists = state.actionItems.some(existing => 
          this.areSimilar(existing.task, actionItem.task)
        );
        
        if (!exists) {
          newActionItems.push(actionItem);
          
          suggestions.push({
            id: `action_item_${Date.now()}_${Math.random()}`,
            type: 'action_item',
            title: 'New Action Item Identified',
            message: `Task: "${actionItem.task}" | Assignee(s): ${actionItem.assignees.join(', ') || 'Not specified'} | Deadline: ${actionItem.deadline ? actionItem.deadline.toLocaleDateString() : 'Not specified'}`,
            priority: 'high',
            timestamp: new Date(),
            isAcknowledged: false
          });
        }
      }
    }

    return {
      suggestions,
      updatedState: {
        actionItems: [...state.actionItems, ...newActionItems]
      }
    };
  }

  private extractActionItems(entry: any, attendees: any[]): ActionItem[] {
    const actionItems: ActionItem[] = [];
    const text = entry.text;
    
    // Find sentences that contain action verbs
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      if (this.containsActionVerb(sentence)) {
        const actionItem = this.parseActionItem(sentence, attendees, entry.timestamp);
        if (actionItem) {
          actionItems.push(actionItem);
        }
      }
    }
    
    return actionItems;
  }

  private containsActionVerb(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.actionVerbs.some(verb => lowerText.includes(verb));
  }

  private parseActionItem(text: string, attendees: any[], timestamp: Date): ActionItem | null {
    const assignees = this.extractAssignees(text, attendees);
    const deadline = this.extractDeadline(text);
    const task = this.cleanTaskText(text);
    
    if (!task || task.length < 10) return null; // Skip very short or unclear tasks
    
    return {
      id: `action_${Date.now()}_${Math.random()}`,
      task: task,
      assignees: assignees,
      deadline: deadline,
      priority: this.determinePriority(text),
      status: 'pending',
      timestamp: timestamp,
      isVerified: false
    };
  }

  private extractAssignees(text: string, attendees: any[]): string[] {
    const assignees: string[] = [];
    
    for (const pattern of this.assigneePatterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1] || match[0];
        if (name) {
          // Try to match with attendees
          const attendee = attendees.find(a => 
            a.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(a.name.toLowerCase())
          );
          
          if (attendee) {
            assignees.push(attendee.name);
          } else {
            assignees.push(name);
          }
        }
      }
    }
    
    return Array.from(new Set(assignees)); // Remove duplicates
  }

  private extractDeadline(text: string): Date | undefined {
    for (const pattern of this.deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        const deadlineText = match[1];
        const deadline = this.parseDeadlineText(deadlineText);
        if (deadline) {
          return deadline;
        }
      }
    }
    return undefined;
  }

  private parseDeadlineText(text: string): Date | undefined {
    const now = new Date();
    const lowerText = text.toLowerCase();
    
    // Handle relative dates
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    if (lowerText.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    if (lowerText.includes('next month')) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }
    
    // Handle "in X days/weeks/months"
    const inMatch = lowerText.match(/in\s+(\d+)\s+(days?|weeks?|months?)/);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2];
      const future = new Date(now);
      
      if (unit.startsWith('day')) {
        future.setDate(future.getDate() + amount);
      } else if (unit.startsWith('week')) {
        future.setDate(future.getDate() + (amount * 7));
      } else if (unit.startsWith('month')) {
        future.setMonth(future.getMonth() + amount);
      }
      
      return future;
    }
    
    return undefined;
  }

  private cleanTaskText(text: string): string {
    // Remove common prefixes and clean up the text
    let cleaned = text
      .replace(/^(?:i will|i'll|i can|i should|we will|we'll|we should)/i, '')
      .replace(/^(?:need to|should|must|have to)/i, '')
      .trim();
    
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned;
  }

  private determinePriority(text: string): 'low' | 'medium' | 'high' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('immediately')) {
      return 'high';
    }
    
    if (lowerText.includes('important') || lowerText.includes('priority') || lowerText.includes('soon')) {
      return 'medium';
    }
    
    return 'low';
  }

  private areSimilar(task1: string, task2: string): boolean {
    // Simple similarity check - in production, you might want to use more sophisticated NLP
    const words1 = task1.toLowerCase().split(/\s+/);
    const words2 = task2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity > 0.7; // 70% similarity threshold
  }
}
