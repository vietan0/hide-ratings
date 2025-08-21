import type { FeatureId } from './storageTypes';

const features: {
  id: FeatureId;
  title: string;
  description: string;
}[] = [{
  id: 'hideRatings',
  title: 'Hide Ratings',
  description: 'Hide all players\' ratings',
}, {
  id: 'hideOpponent',
  title: 'Hide Opponent During Game',
  description: 'Hide opponent details (name, avatar, title, rating, etc.) when playing',
}, {
  id: 'hideFlags',
  title: 'Hide Flags',
  description: 'Hide all country flags everywhere',
}, {
  id: 'hideOwnFlagOnHome',
  title: 'Hide Your Flag on Home',
  description: 'Hide the flag next to your username on the homepage',
}, {
  id: 'analyzeOnLichess',
  title: 'Analyze on Lichess',
  description: 'Add buttons that send your finished games to the Lichess analysis page',
}, {
  id: 'openingExplorer',
  title: 'Opening Explorer',
  description: 'Add Lichess\'s opening explorer to Analysis page',
}, {
  id: 'analysisLinkInArchive',
  title: 'Analysis Link in Archive Games',
  description: 'Add a link in archive games to go straight to Analysis, not Game Review',
}];

export default features;
