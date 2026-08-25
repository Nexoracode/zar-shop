/**
 * Maximum length of a shipment tracking number.
 *
 * Lives here rather than in the route so the admin field can read it without pulling a server
 * route into the client bundle: the input's limit and the endpoint's are one number.
 */
export const trackingNumberMaxLength = 100;
