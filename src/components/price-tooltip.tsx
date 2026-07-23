"use client";

import { Info } from "lucide-react";
import { useState } from "react";

export function PriceTooltip() {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="price-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button type="button" className="price-tooltip-btn">
        <Info size={13} />
        نحوه محاسبه قیمت
      </button>
      {visible && (
        <span className="price-tooltip-box" role="tooltip">
          <span className="price-tooltip-title">فرمول محاسبه قیمت طلا</span>
          <span className="price-tooltip-formula">
            <span className="price-formula-row">
              <span className="price-formula-label">پایه:</span>
              <span>وزن طلا × (قیمت روز طلا + اجرت)</span>
            </span>
            <span className="price-formula-row">
              <span className="price-formula-label">سود:</span>
              <span>+ ۷٪ سود</span>
            </span>
            <span className="price-formula-row">
              <span className="price-formula-label">متعلقات:</span>
              <span>+ متعلقات</span>
            </span>
            <span className="price-formula-row">
              <span className="price-formula-label">مالیات:</span>
              <span>+ ۱۰٪ مالیات از سود و اجرت</span>
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
