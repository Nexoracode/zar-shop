type PriceInput = {
  goldPricePerGram18: number;
  weightGrams: number;
  purity: number;
  makingFeeType: string;
  makingFeeValue: number;
  profitPercent: number;
  taxPercent: number;
};

export function calculateProductPrice(input: PriceInput) {
  const rawGold = input.goldPricePerGram18 * input.weightGrams * (input.purity / 750);
  const makingFee = input.makingFeeType === "FIXED"
    ? input.makingFeeValue
    : rawGold * (input.makingFeeValue / 100);
  const profit = (rawGold + makingFee) * (input.profitPercent / 100);
  const tax = (makingFee + profit) * (input.taxPercent / 100);
  return {
    rawGold: Math.round(rawGold),
    makingFee: Math.round(makingFee),
    profit: Math.round(profit),
    tax: Math.round(tax),
    total: Math.round(rawGold + makingFee + profit + tax),
  };
}
