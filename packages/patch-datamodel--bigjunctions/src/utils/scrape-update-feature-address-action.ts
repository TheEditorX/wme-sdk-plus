/* eslint-disable @typescript-eslint/no-explicit-any */
import { WmeSDK } from 'wme-sdk-typings';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { captureActions, resolveEntityPrototype, runWithModel } from '@wme-enhanced-sdk/wme-utils';

let cachedConstructor: any = null;

/**
 * Lazily scrapes and caches the WME `UpdateFeatureAddress` action constructor.
 *
 * On the first call it:
 *   1. Resolves the WME entity constructors for country, state, city, street, and venue.
 *   2. Constructs a fresh, isolated data model via `W.model.constructor`.
 *   3. Creates minimal dummy entity instances, links them together, and merges them
 *      into the dummy model.
 *   4. Runs {@linkcode sdk.Venues.updateAddress} inside a {@linkcode runWithModel} /
 *      {@linkcode captureActions} context to capture the resulting action.
 *   5. Validates the captured action and caches its constructor.
 *
 * Subsequent calls return the cached constructor immediately without any side effects
 * on the live map editor state.
 */
export async function scrapeUpdateFeatureAddressActionConstructor(sdk: WmeSDK): Promise<any> {
  if (cachedConstructor) return cachedConstructor;

  // Resolve entity constructors sequentially to avoid fetch-interception conflicts
  // (the defaultFetchInterceptor processes filters in insertion order; concurrent calls
  //  would add several filters for the same endpoint before any fetch is consumed).
  const Country = await resolveEntityPrototype('countries', { id: -1 });
  const State = await resolveEntityPrototype('states', { id: -1 });
  const City = await resolveEntityPrototype('cities', { id: -1 });
  const Street = await resolveEntityPrototype('streets', { id: -1, name: null });
  const Venue = await resolveEntityPrototype('venues', { id: '-1' });

  // Create a fresh, isolated data model that won't affect the live editor state
  const win = getWindow<{ W: any }>();
  const dummyModel = new (win.W.model.constructor)();

  // Build minimal entity instances with linked IDs
  const country = new Country({ id: -1 });
  const state = new State({ id: -1, countryID: -1 });
  const city = new City({ id: -1, stateID: -1, countryID: -1, name: '' });
  const street = new Street({ id: -1, cityID: -1, name: null });
  const venue = new Venue({ id: '-1' });

  // Merge all entities into the dummy model repository
  dummyModel.mergeObjects(
    {
      countries: { objects: [country] },
      states: { objects: [state] },
      cities: { objects: [city] },
      streets: { objects: [street] },
      venues: { objects: [venue] },
    },
    { areObjectsInBbox: false },
  );

  // Swap W.model with the dummy model and capture the action produced by updateAddress.
  // dummyModel is also passed explicitly to captureActions so it intercepts the correct
  // actionManager regardless of any concurrent W.model access.
  const [capturedAction] = runWithModel(dummyModel, () =>
    captureActions(() => {
      sdk.Venues.updateAddress({ venueId: '-1', streetId: -1 });
    }, dummyModel),
  );

  if (!capturedAction || capturedAction.actionName !== 'UPDATE_FEATURE_ADDRESS') {
    throw new Error(
      'Unexpected action discovered when trying to resolve UpdateFeatureAddress action constructor: ' +
      (capturedAction?.actionName ?? 'no action captured'),
    );
  }

  cachedConstructor = capturedAction.constructor;
  return cachedConstructor;
}
