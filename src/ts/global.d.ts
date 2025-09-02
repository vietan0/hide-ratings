declare global {
  interface Document {
    /**
     * Only accessible in `ISOLATED` world scripts.
     */
    ccTweaks_responseFenListenerAdded?: boolean;
  }
}

export {};
