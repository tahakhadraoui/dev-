export interface TimeSlot {
  startTime: string;
  endTime: string;
  date?: string; // Optional date to handle next-day slots
}

export interface PendingSlot {
  startTime: string;
  endTime: string;
  comment: string;
  date?: string; // Optional date to handle next-day slots
}