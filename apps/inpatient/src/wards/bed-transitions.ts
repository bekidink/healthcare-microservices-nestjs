import { BadRequestException } from '@nestjs/common';

// A bed's lifecycle is its own small state machine, independent of whichever
// Admission currently occupies it (or doesn't): available -> occupied (an
// admission or an inbound transfer) -> cleaning (a discharge or an outbound
// transfer) -> available (once turnover is done), with out_of_service
// reachable/recoverable administratively. A bed needs turnover before
// reuse — discharge/transfer never puts a bed directly back to available.
export const BED_TRANSITIONS: Record<string, string[]> = {
  available: ['occupied', 'out_of_service'],
  occupied: ['cleaning'],
  cleaning: ['available', 'out_of_service'],
  out_of_service: ['available'],
};

export function assertBedTransition(current: string, next: string) {
  if (!BED_TRANSITIONS[current]?.includes(next)) {
    throw new BadRequestException(`Cannot move a bed from "${current}" to "${next}".`);
  }
}
