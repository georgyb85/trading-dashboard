import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, TrendingUp, AlertTriangle, CheckCircle2, Award } from "lucide-react";

interface ResultsDisplayProps {
  results: any;
  onClear: () => void;
}

const ResultsDisplay = ({ results, onClear }: ResultsDisplayProps) => {
  if (!results) {
    return (
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
            <TrendingUp className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">No analysis results yet</p>
            <p className="text-sm">Configure parameters and run analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRowClassName = (sig: string) => {
    if (sig === "***") return "bg-blue-600/30 hover:bg-blue-600/40 border-l-4 border-l-blue-400";
    if (sig === "**") return "bg-cyan-600/20 hover:bg-cyan-600/30 border-l-4 border-l-cyan-400";
    if (sig === "*") return "bg-slate-700/30 hover:bg-slate-700/40 border-l-4 border-l-slate-400";
    if (sig === "!") return "bg-orange-900/20 hover:bg-orange-900/30 border-l-4 border-l-orange-400";
    return "hover:bg-slate-800/30";
  };

  const getSigLabel = (sig: string) => {
    if (sig === "***") return <span className="font-bold text-blue-400">***</span>;
    if (sig === "**") return <span className="font-bold text-primary">**</span>;
    if (sig === "*") return <span className="font-semibold text-slate-300">*</span>;
    if (sig === "!") return <span className="font-bold text-orange-400">!</span>;
    return <span className="text-slate-500">-</span>;
  };

  return (
    <Card className="lg:sticky lg:top-6 bg-slate-900/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-700">
        <CardTitle className="text-lg">Analysis Results</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClear} className="hover:bg-slate-800">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Starting Analysis Header */}
        <div className="border border-blue-500/30 rounded-lg overflow-hidden">
          <div className="bg-blue-600/20 px-4 py-2 border-b border-blue-500/30">
            <h3 className="font-semibold text-blue-400">Starting New LFS Analysis</h3>
          </div>
          <div className="p-4 space-y-3 bg-slate-900/50">
            <p className="text-sm">
              Data prepared: <span className="font-mono">{results.config.cases}</span> cases, 
              <span className="font-mono"> {results.config.features}</span> features, 
              <span className="font-mono"> 3</span> classes (from 3 bins)
            </p>
            <div>
              <h4 className="font-semibold text-sm mb-2">Configuration:</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm pl-4">
                <div>Features: <span className="text-primary">{results.config.features} selected</span></div>
                <div>Max kept: <span className="text-primary">{results.config.maxKept}</span></div>
                <div>Target: <span className="text-primary">{results.config.target}</span></div>
                <div>Iterations: <span className="text-primary">{results.config.iterations}</span></div>
                <div>Cases: <span className="text-primary">{results.config.cases} (rows 0 to {results.config.cases})</span></div>
                <div>Monte-Carlo trials: <span className="text-primary">{results.config.monteCarloTrials}</span></div>
                <div>Beta trials: <span className="text-primary">20</span></div>
                <div>Max threads: <span className="text-primary">20</span></div>
                <div>Target bins: <span className="text-primary">3</span></div>
                <div>MCPT: <span className="text-primary">10 complete replications</span></div>
                <div>Solver: <span className="text-primary">Legacy</span></div>
                <div>CUDA: <span className="text-primary">Enabled</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* LFS Results Header */}
        <div className="border border-blue-500/30 rounded-lg overflow-hidden">
          <div className="bg-blue-600/20 px-4 py-2 border-b border-blue-500/30">
            <h3 className="font-semibold text-blue-400">LFS Results with MCPT</h3>
          </div>
          <div className="p-4 space-y-3 bg-slate-900/50">
            <div>
              <p className="font-semibold text-sm mb-1">Monte-Carlo Permutation Test Results:</p>
              <div className="text-sm pl-4 space-y-0.5">
                <div>Type: <span className="text-primary">Complete</span></div>
                <div>Replications: <span className="text-primary">10</span></div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">Significance Legend:</p>
              <div className="text-sm pl-4 space-y-0.5">
                <div><span className="font-bold text-blue-400">***</span> Highly significant (p ≤ 0.05) - STRONG predictors</div>
                <div><span className="font-bold text-primary">**</span> Significant (0.05 &lt; p ≤ 0.10) - Good predictors</div>
                <div><span className="font-semibold text-slate-300">*</span> Marginal (0.10 &lt; p ≤ 0.20) - Weak predictors</div>
                <div><span className="font-bold text-orange-400">!</span> Likely noise (p &gt; 0.20) - CAUTION: may be spurious</div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-900 z-10 border-b border-slate-700">
                <TableRow className="hover:bg-slate-900">
                  <TableHead className="w-16 font-semibold">Rank</TableHead>
                  <TableHead className="w-16 font-semibold">Sig</TableHead>
                  <TableHead className="font-semibold">Variable</TableHead>
                  <TableHead className="text-right font-semibold">Pct</TableHead>
                  <TableHead className="text-right font-semibold">Solo p</TableHead>
                  <TableHead className="text-right font-semibold">Unbiased</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.table.map((row: any) => (
                  <TableRow key={row.rank} className={getRowClassName(row.sig)}>
                    <TableCell className="font-mono text-sm">{row.rank}</TableCell>
                    <TableCell>{getSigLabel(row.sig)}</TableCell>
                    <TableCell className="font-mono text-sm">{row.variable}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-primary">{row.pct.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono text-sm text-primary">{row.soloPValue.toFixed(4)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-primary">{row.unbiasedPValue.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Summary */}
        <div className="border border-yellow-600/30 rounded-lg overflow-hidden">
          <div className="bg-slate-900/50 px-4 py-2">
            <h3 className="font-semibold text-warning">Summary:</h3>
          </div>
          <div className="p-4 space-y-1 text-sm bg-slate-900/30">
            <div>Highly significant features (p ≤ 0.05): <span className="text-primary">{results.summary.highlySignificant}</span></div>
            <div>Significant features (p ≤ 0.10): <span className="text-primary">{results.summary.significant}</span></div>
            <div>Marginal features (p ≤ 0.20): <span className="text-primary">{results.summary.marginal}</span></div>
            <div>Likely noise (p &gt; 0.20): <span className="text-primary">{results.summary.noise}</span></div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="border border-green-600/30 rounded-lg overflow-hidden">
          <div className="bg-slate-900/50 px-4 py-2">
            <h3 className="font-semibold text-success">RECOMMENDATIONS:</h3>
          </div>
          <div className="p-4 space-y-2 bg-slate-900/30">
            <p className="text-sm font-semibold">Top statistically significant features for modeling:</p>
            <ol className="text-sm space-y-0.5 pl-4">
              {results.table.slice(0, 10).map((row: any, index: number) => (
                <li key={row.rank}>{index + 1}. {row.variable}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Cautions */}
        {results.cautions && results.cautions.length > 0 && (
          <div className="border border-yellow-600/30 rounded-lg overflow-hidden">
            <div className="bg-slate-900/50 px-4 py-2">
              <h3 className="font-semibold text-warning">CAUTION - High percentage but likely noise:</h3>
            </div>
            <div className="p-4 space-y-1 text-sm bg-slate-900/30">
              {results.cautions.map((caution: any) => (
                <div key={caution.feature} className="font-mono">
                  ! {caution.feature} ({caution.pct}%, p={caution.pValue})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="text-sm space-y-1 text-slate-400 bg-slate-900/30 p-4 rounded-lg">
          <p>Note: Only 10 MCPT replications used.</p>
          <p className="pl-6">Consider using 100-1000 replications for more reliable p-values.</p>
          <p className="mt-2">Note: Solo p-value = P(permuted ≥ original for this feature)</p>
          <p className="pl-6">Unbiased p-value = P(best permuted ≥ original for this feature)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsDisplay;
