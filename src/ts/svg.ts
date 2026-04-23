import browser from 'webextension-polyfill';

export default async function svg(url: string, props = {}) {
  const svgRes = await fetch(browser.runtime.getURL(url));
  const svgText = await svgRes.text();
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;

  Object.entries(props).forEach(([key, value]: [string, any]) => {
    if (key === 'textContent' || key === 'innerHTML') {
      svgElement[key] = value;
    }
    else if (key === 'style' && typeof value === 'object') {
      Object.assign(svgElement.style, value);
    }
    else if (key.startsWith('on')) {
      svgElement.addEventListener(key.slice(2).toLowerCase(), value);
    }
    else {
      svgElement.setAttribute(key, value);
    }
  });

  return svgElement as unknown as SVGElement;
}
