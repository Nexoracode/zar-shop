/** See `shippingFieldLimits`: one number per field, shared by the form control and the schema. */
export const packagingFieldLimits = {
  name: 100,
  maxDimensionCm: 999.99,
  maxWeightGrams: 500_000,
  maxBoxWeightGrams: 10_000,
  maxTapinBoxId: 999,
} as const;
