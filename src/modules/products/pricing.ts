import { Prisma } from "@generated/prisma/client";

type DecimalValue = number | string | Prisma.Decimal;

type PriceInput = {
  goldPricePerGram18: DecimalValue;
  weightGrams: DecimalValue;
  purity: number;
  makingFeeType: string;
  makingFeeValue: DecimalValue;
  profitPercent: DecimalValue;
  taxPercent: DecimalValue;
};

export function calculateProductPrice(input: PriceInput) {
  const rawGold = new Prisma.Decimal(input.goldPricePerGram18)
    .mul(input.weightGrams)
    .mul(input.purity)
    .div(750);
  const makingFee = input.makingFeeType === "FIXED"
    ? new Prisma.Decimal(input.makingFeeValue)
    : rawGold.mul(input.makingFeeValue).div(100);
  const profit = rawGold.add(makingFee).mul(input.profitPercent).div(100);
  const tax = makingFee.add(profit).mul(input.taxPercent).div(100);
  const rial = (value: Prisma.Decimal) => value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  return {
    rawGold: rial(rawGold),
    makingFee: rial(makingFee),
    profit: rial(profit),
    tax: rial(tax),
    total: rial(rawGold.add(makingFee).add(profit).add(tax)),
  };
}
