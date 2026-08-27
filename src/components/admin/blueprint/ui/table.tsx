import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function BpTable({ ariaLabel, minWidth, children, className = "" }: { ariaLabel: string; minWidth?: number; children: ReactNode; className?: string }) {
  return (
    <div className="bp-table-scroll">
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
