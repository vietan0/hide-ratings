import * as z from 'zod';

const featureIdZ = z.union([
  z.literal('hideRatings'),
  z.literal('hideOpponent'),
  z.literal('hideFlags'),
  z.literal('hideOwnFlagOnHome'),
  z.literal('analyzeOnLichess'),
  z.literal('openingExplorer'),
]);

export type FeatureId = z.infer<typeof featureIdZ>;

export function isFeatureId(key: string): key is FeatureId {
  return featureIdZ.safeParse(key).success;
}

const featureStorageZ = z.object({
  hideRatings: z.boolean(),
  hideOpponent: z.boolean(),
  hideFlags: z.boolean(),
  hideOwnFlagOnHome: z.boolean(),
  analyzeOnLichess: z.boolean(),
  openingExplorer: z.boolean(),
});

export type FeatureStorage = z.infer<typeof featureStorageZ>;

const ratingZ = z.union([
  z.literal(400),
  z.literal(1000),
  z.literal(1200),
  z.literal(1400),
  z.literal(1600),
  z.literal(1800),
  z.literal(2000),
  z.literal(2200),
  z.literal(2500),
]);

export const ratings = ratingZ.options.map(option => option.value);
export type Rating = z.infer<typeof ratingZ>;

const timeControlZ = z.union([
  z.literal('ultraBullet'),
  z.literal('bullet'),
  z.literal('blitz'),
  z.literal('rapid'),
  z.literal('classical'),
  z.literal('correspondence'),
]);

export const timeControls = timeControlZ.options.map(option => option.value);
export type TimeControl = z.infer<typeof timeControlZ>;
export const extStorageZ = featureStorageZ.extend({
  database: z.union([z.literal('lichess'), z.literal('masters')]),
  databaseOptions: z.object({
    lichess: z.object({
      speeds: z.array(timeControlZ),
      ratings: z.array(ratingZ),
      since: z.union([z.string(), z.undefined()]),
      until: z.union([z.string(), z.undefined()]),
    }),
    masters: z.object({
      since: z.union([z.number(), z.undefined()]),
      until: z.union([z.number(), z.undefined()]),
    }),
  }),
});
export type ExtStorage = z.infer<typeof extStorageZ>;
