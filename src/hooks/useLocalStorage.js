/**
 * Custom hook for reactive localStorage state management
 * Provides [value, setValue, removeValue] with cross-tab synchronization.
 * @module hooks/useLocalStorage
 */

import { useCallback, useEffect, useState } from 'react';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/localStorage.js';

/**
 * Custom hook that syncs React state with localStorage.
 * Automatically handles JSON serialization/deserialization,
 * error recovery, and cross-tab updates via the `storage` event.
 *
 * @param {string} key - The localStorage key (will be prefixed with `horizon_` if needed).
 * @param {*} initialValue - The default value when the key does not exist in localStorage.
 * @returns {[*, function, function]} A tuple of [storedValue, setValue, removeValue].
 *
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage('horizon_theme', 'light');
 * setTheme('dark');
 * removeTheme(); // removes key and resets to initialValue
 */
const useLocalStorage = (key, initialValue) => {
  // Lazy initializer — read from localStorage on first render only
  const [storedValue, setStoredValue] = useState(() => {
    if (!key || typeof key !== 'string') {
      return initialValue;
    }

    try {
      const item = getStorageItem(key, undefined);
      return item !== undefined ? item : initialValue;
    } catch (_err) {
      console.error(`useLocalStorage: Failed to read key "${key}":`, _err);
      return initialValue;
    }
  });

  /**
   * Update both React state and localStorage.
   * Accepts a direct value or an updater function (like useState).
   *
   * @param {*|function} value - New value or updater function receiving the previous value.
   */
  const setValue = useCallback(
    (value) => {
      if (!key || typeof key !== 'string') {
        return;
      }

      try {
        // Support functional updates like useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);
        setStorageItem(key, valueToStore);
      } catch (_err) {
        console.error(`useLocalStorage: Failed to set key "${key}":`, _err);
      }
    },
    [key, storedValue],
  );

  /**
   * Remove the key from localStorage and reset state to initialValue.
   */
  const removeValue = useCallback(() => {
    if (!key || typeof key !== 'string') {
      return;
    }

    try {
      removeStorageItem(key);
      setStoredValue(initialValue);
    } catch (_err) {
      console.error(`useLocalStorage: Failed to remove key "${key}":`, _err);
    }
  }, [key, initialValue]);

  // Listen for cross-tab storage events to keep state in sync
  useEffect(() => {
    if (!key || typeof key !== 'string') {
      return;
    }

    /**
     * Handle the native `storage` event fired when another tab/window
     * modifies localStorage for the same origin.
     * @param {StorageEvent} event
     */
    const handleStorageChange = (event) => {
      // Build the prefixed key to compare against the event key
      const prefixedKey = key.startsWith('horizon_') ? key : `horizon_${key}`;

      if (event.key !== prefixedKey) {
        return;
      }

      try {
        if (event.newValue === null) {
          // Key was removed in another tab
          setStoredValue(initialValue);
        } else {
          const parsed = JSON.parse(event.newValue);
          setStoredValue(parsed);
        }
      } catch (_err) {
        console.error(`useLocalStorage: Failed to parse cross-tab update for key "${key}":`, _err);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

export default useLocalStorage;