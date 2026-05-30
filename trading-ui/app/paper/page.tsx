import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPaperDeskEnabled } from "@/lib/features";
import PaperDeskClient from "./PaperDeskClient";

export const metadata: Metadata = {
  title: "Paper Desk | StockWin",
  description: "A paper-only StockWin research desk with deterministic Macro, Research, and Risk agents.",
};

export default function PaperDeskPage() {
  if (!isPaperDeskEnabled()) {
    notFound();
  }

  return <PaperDeskClient />;
}
