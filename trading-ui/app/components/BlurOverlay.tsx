"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface BlurOverlayProps {
  children: React.ReactNode;
  isBlurred: boolean;
  onUpgradeClick?: () => void;
  predictionName?: string;
}

export function BlurOverlay({ children, isBlurred, onUpgradeClick, predictionName }: BlurOverlayProps) {
  const router = useRouter();

  if (!isBlurred) {
    return <>{children}</>;
  }

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
      return;
    }
    router.push("/dashboard/billing");
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)]">
      <div className="pointer-events-none select-none opacity-35 blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
        <div className="sw-card max-w-sm p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border">
            <Lock className="h-4 w-4" />
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em]">Professional access</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {predictionName ? `${predictionName} is part of the full desk.` : "This forecast is part of the full desk."}
          </p>
          <button type="button" onClick={handleUpgradeClick} className="sw-button-primary mt-5 w-full">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
