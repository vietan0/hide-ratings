declare global {
  interface Document {
    /**
     * Only accessible in the `MAIN` world scripts.
     */
    ccTweaks_arrowKeys?: string[];
    /**
     * Only accessible in the `ISOLATED` world scripts.
     */
    ccTweaks_responseFenListenerAdded?: boolean;
  }
}

export {};
