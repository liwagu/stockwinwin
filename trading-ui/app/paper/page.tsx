import type { Metadata } from "next";
import PaperDeskClient from "./PaperDeskClient";

export const metadata: Metadata = {
  title: "Paper Desk | StockWin",
  description: "A paper-only StockWin research desk with deterministic Macro, Research, and Risk agents.",
};

export default function PaperDeskPage() {
  return <PaperDeskClient />;
}
