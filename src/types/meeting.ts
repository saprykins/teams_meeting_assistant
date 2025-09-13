// Core meeting types and interfaces

export interface MeetingState {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  attendees: Attendee[];
  agenda: AgendaItem[];
  currentAgendaItem?: number;
  transcript: TranscriptEntry[];
  decisions: Decision[];
  actionItems: ActionItem[];
  suggestions: Suggestion[];
  isActive: boolean;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  isOrganizer: boolean;
  isPresent: boolean;
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration?: number; // in minutes
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: string;
  text: string;
  confidence?: number;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  participants: string[];
  isVerified: boolean;
}

export interface ActionItem {
  id: string;
  task: string;
  assignees: string[];
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  timestamp: Date;
  isVerified: boolean;
}

export interface Suggestion {
  id: string;
  type: 'ambiguity' | 'goal_tracking' | 'action_item' | 'specificity' | 'finalization' | 'ai_insight';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  isAcknowledged: boolean;
}

export interface ModuleResult {
  suggestions: Suggestion[];
  updatedState: Partial<MeetingState>;
}

export interface MeetingSummary {
  title: string;
  date: Date;
  duration: number;
  attendees: Attendee[];
  absentees: Attendee[];
  purpose: string;
  decisions: Decision[];
  actionItems: ActionItem[];
  nextSteps: string[];
}
