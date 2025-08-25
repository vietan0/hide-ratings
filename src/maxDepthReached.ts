export default function maxDepthReached(fen: string) {
  const fullMoveRegex = /(?<=\s)\d+$/;
  const fullMove = fen.match(fullMoveRegex)![0];

  return Number(fullMove) > 25;
}
