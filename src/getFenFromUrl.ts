export default function getFenFromUrl(url: string) {
  const urlObj = new URL(url);
  const paramsObj = new URLSearchParams(urlObj.search);

  return paramsObj.get('fen');
}
