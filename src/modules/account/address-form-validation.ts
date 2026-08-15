import { normalizeNumericValue } from "@/lib/persian-numbers";

export type AddressFormField = "provinceId" | "cityId" | "addressLine" | "plaque" | "postalCode" | "title";
export type AddressFormErrors = Partial<Record<AddressFormField, string>>;

export type AddressFormValues = Record<AddressFormField, string>;

export function validateAddressForm(values: AddressFormValues): AddressFormErrors {
  const errors: AddressFormErrors = {};
  const addressLine = values.addressLine.trim();
  const plaque = values.plaque.trim();
  const postalCode = normalizeNumericValue(values.postalCode, false);
  const title = values.title.trim();

  if (!values.provinceId) errors.provinceId = "انتخاب استان الزامی است.";
  if (!values.cityId) errors.cityId = "انتخاب شهر الزامی است.";
  if (!addressLine) errors.addressLine = "وارد کردن آدرس الزامی است.";
  else if (addressLine.length < 10) errors.addressLine = "آدرس باید حداقل ۱۰ کاراکتر باشد.";
  if (!plaque) errors.plaque = "وارد کردن پلاک الزامی است.";
  if (!postalCode) errors.postalCode = "وارد کردن کدپستی الزامی است.";
  else if (!/^\d{10}$/.test(postalCode)) errors.postalCode = "کدپستی باید دقیقاً ۱۰ رقم باشد.";
  if (!title) errors.title = "وارد کردن عنوان آدرس الزامی است.";
  else if (title.length < 2) errors.title = "عنوان آدرس باید حداقل ۲ کاراکتر باشد.";

  return errors;
}
