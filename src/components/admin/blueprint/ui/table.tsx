import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function BpTable({ ariaLabel, minWidth, children, className = "", alwaysScrollable = false }: {
  ariaLabel: string;
  minWidth?: number;
  children: ReactNode;
  className?: string;
  /**
   * Past 960px the scroll container normally turns itself off so the header can stick to the
   * page instead of to this box — an assumption that only holds when the table gets the page's
   * full width. Set this for a table embedded in a narrower column, where its own minimum can
   * still be wider than the space it actually has.
   */
  alwaysScrollable?: boolean;
}) {
  return (
    <div className={`bp-table-scroll ${alwaysScrollable ? "bp-table-scroll-fixed" : ""}`.trim()}>
      <table aria-label={ariaLabel} className={`bp-table ${className}`.trim()} style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function BpTh({ children, className = "", ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <th scope="col" className={className} {...rest}>{children}</th>;
}

export function BpTd({ children, className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <td className={className} {...rest}>{children}</td>;
}
