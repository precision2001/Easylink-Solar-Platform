export type LocationStepState = {
  address: string;
  location: { lat: number; lng: number } | null;
  /**
   * True once the address text came from Google (a picked suggestion, the
   * map pin's reverse geocode, or a saved design's address + pin). Typing in
   * the box clears it, because the pin no longer matches the text.
   */
  addressConfirmed: boolean;
};

export const LOCATION_REQUIRED_MESSAGE =
  "Please choose your address from the suggestions (or move the map pin onto your roof) to continue.";

/**
 * Null when the location step can be left, otherwise the message to show.
 * The solar step needs real map coordinates for the address, so a typed-but-
 * unpicked address isn't enough.
 */
export function locationStepError(state: LocationStepState): string | null {
  const hasAddress = state.address.trim().length > 0;
  const hasPin =
    state.location != null &&
    Number.isFinite(state.location.lat) &&
    Number.isFinite(state.location.lng);
  if (!hasAddress || !hasPin || !state.addressConfirmed) {
    return LOCATION_REQUIRED_MESSAGE;
  }
  return null;
}
