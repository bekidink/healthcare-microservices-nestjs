import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchCandidate {
  patientId: string;
  score: number;
  reasons: string[];
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Deterministic MPI matching heuristic — intentionally simple (exact
 * national-ID match, or normalized name+DOB, or normalized name+phone)
 * rather than a real probabilistic/phonetic matching algorithm. This is
 * enough to demonstrate "duplicate detection before registration" and
 * "flag and route to MPI review; do not silently merge" end-to-end; a real
 * deployment should replace this with a proper MPI matching library
 * (Soundex/phonetic name matching, weighted probabilistic scoring, etc.)
 * before going anywhere near production patient data.
 */
@Injectable()
export class PatientMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(input: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    nationalId?: string;
    phone?: string;
    excludePatientId?: string;
  }): Promise<MatchCandidate[]> {
    const candidates = new Map<string, MatchCandidate>();

    const addCandidate = (patientId: string, score: number, reason: string) => {
      if (patientId === input.excludePatientId) return;
      const existing = candidates.get(patientId);
      if (existing) {
        existing.score = Math.max(existing.score, score);
        existing.reasons.push(reason);
      } else {
        candidates.set(patientId, { patientId, score, reasons: [reason] });
      }
    };

    // Tier 1 (score 95): exact national ID match — the strongest signal available.
    if (input.nationalId) {
      const matches = await this.prisma.patientIdentifier.findMany({
        where: { type: 'national_id', value: input.nationalId },
      });
      for (const m of matches) addCandidate(m.patientId, 95, 'national_id_exact_match');
    }

    // Tier 2 (score 80): normalized first+last name and date of birth both match.
    const nameMatches = await this.prisma.patient.findMany({
      where: {
        dateOfBirth: input.dateOfBirth,
        status: { not: 'merged' },
      },
    });
    for (const p of nameMatches) {
      if (normalize(p.firstName) === normalize(input.firstName) && normalize(p.lastName) === normalize(input.lastName)) {
        addCandidate(p.id, 80, 'name_and_dob_match');
      }
    }

    // Tier 3 (score 65): normalized name matches and phone matches, DOB not required.
    if (input.phone) {
      const phoneMatches = await this.prisma.patientContact.findMany({
        where: { type: 'phone', value: input.phone },
        include: { patient: true },
      });
      for (const c of phoneMatches) {
        if (c.patient.status === 'merged') continue;
        if (
          normalize(c.patient.firstName) === normalize(input.firstName) &&
          normalize(c.patient.lastName) === normalize(input.lastName)
        ) {
          addCandidate(c.patientId, 65, 'name_and_phone_match');
        }
      }
    }

    return [...candidates.values()].sort((a, b) => b.score - a.score);
  }
}
