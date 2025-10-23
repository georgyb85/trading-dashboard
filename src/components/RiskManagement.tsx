import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, StopCircle, DollarSign, TrendingDown, AlertCircle, Settings } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface RiskMetrics {
  currentExposure: number;
  maxExposure: number;
  positionCount: number;
  maxPositions: number;
  drawdown: number;
  maxDrawdown: number;
  riskScore: number;
  var95: number; // Value at Risk 95%
  sharpeRatio: number;
}

interface RiskControls {
  tradingEnabled: boolean;
  newPositionsEnabled: boolean;
  maxPositionSize: number;
  maxTotalExposure: number;
  stopLossEnabled: boolean;
  emergencyStopTriggered: boolean;
}

export function RiskManagement() {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    currentExposure: 8947.62,
    maxExposure: 25000,
    positionCount: 3,
    maxPositions: 8,
    drawdown: -2.3,
    maxDrawdown: -15.0,
    riskScore: 34,
    var95: -1247.30,
    sharpeRatio: 2.14
  });

  const [riskControls, setRiskControls] = useState<RiskControls>({
    tradingEnabled: true,
    newPositionsEnabled: true,
    maxPositionSize: 5000,
    maxTotalExposure: 25000,
    stopLossEnabled: true,
    emergencyStopTriggered: false
  });

  const [alertThresholds, setAlertThresholds] = useState({
    maxDrawdown: 10,
    maxRiskScore: 80,
    maxExposurePercent: 90
  });

  // Simulate real-time risk metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRiskMetrics(prev => ({
        ...prev,
        currentExposure: Math.max(0, prev.currentExposure + (Math.random() - 0.5) * 500),
        drawdown: Math.max(-20, Math.min(0, prev.drawdown + (Math.random() - 0.5) * 1)),
        riskScore: Math.max(0, Math.min(100, prev.riskScore + (Math.random() - 0.5) * 10)),
        var95: prev.var95 + (Math.random() - 0.5) * 100,
        sharpeRatio: Math.max(0, prev.sharpeRatio + (Math.random() - 0.5) * 0.2)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getExposureUtilization = () => (riskMetrics.currentExposure / riskMetrics.maxExposure) * 100;
  const getPositionUtilization = () => (riskMetrics.positionCount / riskMetrics.maxPositions) * 100;

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-success";
    if (score < 70) return "text-warning";
    return "text-loss";
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 60) return "";
    if (percentage < 85) return "text-warning";
    return "text-loss";
  };

  const handleEmergencyStop = () => {
    setRiskControls(prev => ({
      ...prev,
      tradingEnabled: false,
      newPositionsEnabled: false,
      emergencyStopTriggered: true
    }));
  };

  const handleResetEmergencyStop = () => {
    setRiskControls(prev => ({
      ...prev,
      emergencyStopTriggered: false
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Risk Management</h1>
        <div className="flex items-center gap-4">
          <Badge 
            variant={riskControls.emergencyStopTriggered ? "destructive" : "outline"} 
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            {riskControls.emergencyStopTriggered ? "Emergency Stop Active" : "System Normal"}
          </Badge>
        </div>
      </div>

      {/* Emergency Stop Alert */}
      {riskControls.emergencyStopTriggered && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Emergency Stop Activated</h3>
                <p className="text-sm text-muted-foreground">All trading has been halted. No new positions will be opened.</p>
              </div>
              <Button variant="outline" onClick={handleResetEmergencyStop}>
                Reset Emergency Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.riskScore)}`}>
              {Math.round(riskMetrics.riskScore)}
            </div>
            <p className="text-xs text-muted-foreground">
              0 = Low Risk, 100 = High Risk
            </p>
            <Progress 
              value={riskMetrics.riskScore} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskMetrics.drawdown < -5 ? 'text-loss' : 'text-muted-foreground'}`}>
              {riskMetrics.drawdown.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Max: {riskMetrics.maxDrawdown}%
            </p>
            <Progress 
              value={Math.abs(riskMetrics.drawdown / riskMetrics.maxDrawdown) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VaR (95%)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-loss">
              ${Math.abs(riskMetrics.var95).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Daily potential loss
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {riskMetrics.sharpeRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted return
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exposure and Position Limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Exposure Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Exposure</span>
                <span className={`font-mono ${getUtilizationColor(getExposureUtilization())}`}>
                  ${riskMetrics.currentExposure.toLocaleString()} / ${riskMetrics.maxExposure.toLocaleString()}
                </span>
              </div>
              <Progress value={getExposureUtilization()} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {getExposureUtilization().toFixed(1)}% of maximum exposure used
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Positions</span>
                <span className={`font-mono ${getUtilizationColor(getPositionUtilization())}`}>
                  {riskMetrics.positionCount} / {riskMetrics.maxPositions}
                </span>
              </div>
              <Progress value={getPositionUtilization()} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {getPositionUtilization().toFixed(1)}% of maximum positions used
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Risk Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trading-enabled">Trading Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow new and existing trades</p>
              </div>
              <Switch
                id="trading-enabled"
                checked={riskControls.tradingEnabled && !riskControls.emergencyStopTriggered}
                onCheckedChange={(checked) => 
                  setRiskControls(prev => ({ ...prev, tradingEnabled: checked }))
                }
                disabled={riskControls.emergencyStopTriggered}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new-positions">New Positions</Label>
                <p className="text-xs text-muted-foreground">Allow opening new positions</p>
              </div>
              <Switch
                id="new-positions"
                checked={riskControls.newPositionsEnabled && !riskControls.emergencyStopTriggered}
                onCheckedChange={(checked) => 
                  setRiskControls(prev => ({ ...prev, newPositionsEnabled: checked }))
                }
                disabled={riskControls.emergencyStopTriggered}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="stop-loss">Stop Loss Protection</Label>
                <p className="text-xs text-muted-foreground">Automatic stop loss orders</p>
              </div>
              <Switch
                id="stop-loss"
                checked={riskControls.stopLossEnabled}
                onCheckedChange={(checked) => 
                  setRiskControls(prev => ({ ...prev, stopLossEnabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Limits Configuration */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Risk Limits Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Maximum Position Size: ${riskControls.maxPositionSize.toLocaleString()}</Label>
              <Slider
                value={[riskControls.maxPositionSize]}
                onValueChange={([value]) => 
                  setRiskControls(prev => ({ ...prev, maxPositionSize: value }))
                }
                min={1000}
                max={10000}
                step={500}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum USD value per individual position
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Total Exposure: ${riskControls.maxTotalExposure.toLocaleString()}</Label>
              <Slider
                value={[riskControls.maxTotalExposure]}
                onValueChange={([value]) => 
                  setRiskControls(prev => ({ ...prev, maxTotalExposure: value }))
                }
                min={10000}
                max={100000}
                step={5000}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum total USD exposure across all positions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card className="trading-card border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <StopCircle className="h-5 w-5" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Emergency Stop</h3>
              <p className="text-sm text-muted-foreground">
                Immediately halt all trading activity and prevent new positions. 
                Existing positions will remain open but no new trades will be executed.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="lg"
                  className="emergency-stop"
                  disabled={riskControls.emergencyStopTriggered}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {riskControls.emergencyStopTriggered ? "Stop Active" : "Emergency Stop"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">Confirm Emergency Stop</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately halt all trading operations. Are you sure you want to trigger the emergency stop?
                    This action will:
                    <br />• Stop all new position openings
                    <br />• Disable automated trading
                    <br />• Require manual reset to resume operations
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmergencyStop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirm Emergency Stop
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}