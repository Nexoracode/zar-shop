"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import { Alert, Button, Card, Chip, Input, Table as HeroTable } from "@heroui/react";

export { Button, Card, Input };
const subscribe = () => () => undefined;

export function Table(props: ComponentProps<typeof HeroTable>) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return <div className="hidden min-h-48 animate-pulse bg-slate-50 md:block" aria-hidden="true" />;
  return <HeroTable {...props} />;
}

export const AlertRoot = Alert;
export const AlertDescription = Alert.Description;
export const CardContent = Card.Content;
export const ChipRoot = Chip;
export const ChipLabel = Chip.Label;
export const TableScrollContainer = HeroTable.ScrollContainer;
export const TableContent = HeroTable.Content;
export const TableHeader = HeroTable.Header;
export const TableColumn = HeroTable.Column;
export const TableBody = HeroTable.Body;
export const TableRow = HeroTable.Row;
export const TableCell = HeroTable.Cell;
