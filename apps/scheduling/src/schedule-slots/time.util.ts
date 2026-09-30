const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

/** Splits a [startTime, endTime) window into consecutive [start, end) slots of durationMins each. */
export function splitIntoSlots(startTime: string, endTime: string, durationMins: number): [string, string][] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots: [string, string][] = [];

  for (let cursor = start; cursor + durationMins <= end; cursor += durationMins) {
    slots.push([toHHMM(cursor), toHHMM(cursor + durationMins)]);
  }

  return slots;
}
