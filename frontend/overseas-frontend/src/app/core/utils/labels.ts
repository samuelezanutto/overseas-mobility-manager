const MOBILITY_STATUS_LABELS: Record<string, string> = {
  created: 'Created',
  awaiting_la_approval: 'Awaiting LA Approval',
  pre_departure_completed: 'Pre-Departure Completed',
  mobility_in_progress: 'Mobility In Progress',
  waiting_score_approval: 'Waiting Score Approval',
  closed: 'Closed',
  canceled: 'Canceled',
};

const MOBILITY_PERIOD_LABELS: Record<string, string> = {
  first_semester: 'First Semester',
  second_semester: 'Second Semester',
  full_year: 'Full Year',
};

export function statusLabel(status: string): string {
  return MOBILITY_STATUS_LABELS[status] ?? status;
}

export function periodLabel(period: string): string {
  return MOBILITY_PERIOD_LABELS[period] ?? period;
}
