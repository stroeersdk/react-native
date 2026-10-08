import { useCallback, useEffect, useState } from 'react';
import { StroeerConsentModule, formatNativeError } from 'react-native-stroeer-sdk';

/**
 * Wraps StroeerConsentModule. The module is optional: isAvailable() is false when the SDK build
 * has no consent bridge (e.g. Android in 1.0.0-rc1), in which case the buttons should be disabled.
 * If you have your own consent management system, you can skip this entirely.
 */
export function useConsent(notify: (message: string) => void) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    StroeerConsentModule.isAvailable()
      .then(value => {
        if (!cancelled) {
          setAvailable(value);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (error) {
        notify(`Consent error: ${formatNativeError(error)}`);
      }
    },
    [notify],
  );

  // initialize() prepares the CMP, showConsent() displays the dialog if consent is needed.
  const collect = useCallback(
    () =>
      run(async () => {
        await StroeerConsentModule.initialize();
        await StroeerConsentModule.showConsent();
      }),
    [run],
  );

  const showPrivacy = useCallback(
    () => run(() => StroeerConsentModule.showPrivacyManager()),
    [run],
  );

  const clear = useCallback(
    () =>
      run(async () => {
        await StroeerConsentModule.clearConsent();
        notify('Consent reset');
      }),
    [run, notify],
  );

  return { available, collect, showPrivacy, clear };
}
