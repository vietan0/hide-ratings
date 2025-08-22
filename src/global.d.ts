declare global {
  interface Document {
    /**
     * Only accessible in the `ISOLATED` world scripts.
     */
    ccTweaks_responseFenListenerAdded?: boolean;
    /**
     * Only accessible in the `ISOLATED` world scripts.
     */
    ccTweaks_liResChangeListenerAdded?: boolean;
  }
}

export {};
