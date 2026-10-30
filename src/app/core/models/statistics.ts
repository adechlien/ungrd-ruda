export interface StatisticCount { label: string; count: number; }

export interface StatisticsSummary {
  totals: { events: number; displacements: number; declarants: number };
  breakdowns: {
    eventTypes: StatisticCount[];
    sex: StatisticCount[];
    origins: StatisticCount[];
    departureMoment: StatisticCount[];
    accommodation: StatisticCount[];
    noReturn: StatisticCount[];
    departureCharacter: StatisticCount[];
    evolution: StatisticCount[];
  };
}

export const EMPTY_STATISTICS: StatisticsSummary = {
  totals: { events: 0, displacements: 0, declarants: 0 },
  breakdowns: {
    eventTypes: [], sex: [], origins: [], departureMoment: [],
    accommodation: [], noReturn: [], departureCharacter: [], evolution: [],
  },
};
