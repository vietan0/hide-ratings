const featureIds = ['hideRatings', 'hideOpponent', 'hideFlags', 'hideOwnFlagOnHome', 'analyzeOnLichess', 'openingExplorer', 'analysisLinkInArchive'] as const;

export type FeatureId = typeof featureIds[number];

export function isFeatureId(key: string): key is FeatureId {
  return (featureIds as readonly string[]).includes(key);
}

export type FeatureStorage = Record<FeatureId, boolean>;
export const timeControls = ['ultraBullet', 'bullet', 'blitz', 'rapid', 'classical', 'correspondence'] as const;
export type TimeControl = typeof timeControls[number];
export const ratings = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500] as const;
export type Rating = typeof ratings[number];
export type ExtStorage = FeatureStorage & {
  database: 'lichess' | 'masters';
  databaseOptions: {
    lichess: {
      speeds: TimeControl[];
      ratings: Rating[];
      since: string | undefined;
      until: string | undefined;
    };
    masters: {
      since: number | undefined;
      until: number | undefined;
    };
  };
};
