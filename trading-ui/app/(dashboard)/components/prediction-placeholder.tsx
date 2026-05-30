import { Loader2 } from "lucide-react";

type PredictionPlaceholderProps = {
    assetName: string;
};

export function PredictionPlaceholder({ assetName }: PredictionPlaceholderProps) {
    return (
        <article className="sw-card flex min-h-[31rem] flex-col p-5">
            <div className="space-y-1 border-b pb-4">
                <p className="sw-label">Queued</p>
                <h3 className="text-xl font-semibold tracking-[-0.035em]">{assetName}</h3>
                <p className="text-sm text-muted-foreground">Waiting for a fresh forecast.</p>
            </div>
            <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Generating prediction data</p>
                </div>
            </div>
        </article>
    );
}
