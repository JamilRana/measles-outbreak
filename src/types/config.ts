export interface CutoffSettings {
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  allowBacklogReporting: boolean;
  backlogStartDate: string | null;
  backlogEndDate: string | null;
}

export interface Settings {
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  outbreakBacklog?: {
    allowBacklogReporting: boolean;
    backlogStartDate: string | null;
    backlogEndDate: string | null;
  };
}
