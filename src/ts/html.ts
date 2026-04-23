export default function html<T extends keyof HTMLElementTagNameMap>(tag: T, props?: Omit<Partial<HTMLElementTagNameMap[T]>, 'style'> & { style?: Partial<CSSStyleDeclaration> } & { [key: string]: any }, children: (Element | null)[] = []) {
  const element = document.createElement(tag);

  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'textContent' || key === 'innerHTML' || key === 'className' || key.startsWith('aria')) {
        // @ts-expect-error <Can't type key>
        element[key] = value;
      }
      else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      }
      else if (key === 'dataset' && typeof value === 'object') {
        Object.entries(value).forEach(([k, v]: [string, any]) => {
          element.dataset[k] = v;
        });
      }
      else if (key.startsWith('on')) {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      }
      else {
        element.setAttribute(key, value);
      }
    });
  }

  children.flat().forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    }
    else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  return element;
}
