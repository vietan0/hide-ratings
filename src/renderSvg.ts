import browser from 'webextension-polyfill';

export default async function renderSvg(url: string) {
  const svgRes = await fetch(browser.runtime.getURL(url));
  const svgText = await svgRes.text();
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;

  return svgElement as unknown as SVGElement;
}
