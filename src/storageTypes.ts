const featureIds = ['hideRatings', 'hideOpponent', 'hideFlags', 'hideOwnFlagOnHome', 'analyzeOnLichess', 'openingExplorer'] as const;

export type FeatureId = typeof featureIds[number];

export function isFeatureId(key: string): key is FeatureId {
  return (featureIds as readonly string[]).includes(key);
}

export type FeatureStorage = Record<FeatureId, boolean>;

type Speed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';
type Rating = 1000 | 1200 | 1400 | 1600 | 1800 | 2000 | 2200 | 2500;

export interface ExtStorage extends FeatureStorage {
  database: 'lichess' | 'masters';
  databaseOptions: {
    lichess: {
      speeds: Speed[];
      ratings: Rating[];
      since: string | undefined;
      until: string | undefined;
    };
    masters: {
      since: number | undefined;
      until: number | undefined;
    };
  };
}
