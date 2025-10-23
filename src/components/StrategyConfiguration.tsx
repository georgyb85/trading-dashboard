import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings, Brain, DollarSign, Shield, Save, RotateCcw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradingConfig {
  enabled: boolean;
  positionSize: number;
  maxPositions: number;
  longThreshold: number;
  shortThreshold: number;
  thresholdMode: 'OptimalROC' | 'Percentile' | 'ZeroCrossover';
}

interface RiskConfig {
  useStopLoss: boolean;
  stopLossPct: number;
  useTakeProfit: boolean;
  takeProfitPct: number;
  useATRStops: boolean;
  atrMultiplier: number;
  stopLossCooldownBars: number;
  trailingStopEnabled: boolean;
  trailingStopPct: number;
}

interface ModelConfig {
  updateFrequency: number;
  confidenceThreshold: number;
  retrainTrigger: 'Time' | 'Performance' | 'DataDrift';
  retrainInterval: number;
  featureSelection: 'All' | 'TopN' | 'Importance';
  maxFeatures: number;
}

export function StrategyConfiguration() {
  const { toast } = useToast();
  
  const [tradingConfig, setTradingConfig] = useState<TradingConfig>({
    enabled: true,
    positionSize: 2500,
    maxPositions: 8,
    longThreshold: 0.65,
    shortThreshold: -0.65,
    thresholdMode: 'OptimalROC'
  });

  const [riskConfig, setRiskConfig] = useState<RiskConfig>({
    useStopLoss: true,
    stopLossPct: 3.5,
    useTakeProfit: true,
    takeProfitPct: 7.0,
    useATRStops: false,
    atrMultiplier: 2.0,
    stopLossCooldownBars: 12,
    trailingStopEnabled: false,
    trailingStopPct: 2.0
  });

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    updateFrequency: 300, // seconds
    confidenceThreshold: 0.75,
    retrainTrigger: 'Time',
    retrainInterval: 24, // hours
    featureSelection: 'TopN',
    maxFeatures: 50
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSaveConfig = () => {
    // Here you would typically send the config to your backend API
    toast({
      title: "Configuration Saved",
      description: "Strategy configuration has been updated successfully.",
    });
    setHasUnsavedChanges(false);
  };

  const handleResetConfig = () => {
    // Reset to default values
    setTradingConfig({
      enabled: true,
      positionSize: 2500,
      maxPositions: 8,
      longThreshold: 0.65,
      shortThreshold: -0.65,
      thresholdMode: 'OptimalROC'
    });
    setRiskConfig({
      useStopLoss: true,
      stopLossPct: 3.5,
      useTakeProfit: true,
      takeProfitPct: 7.0,
      useATRStops: false,
      atrMultiplier: 2.0,
      stopLossCooldownBars: 12,
      trailingStopEnabled: false,
      trailingStopPct: 2.0
    });
    setModelConfig({
      updateFrequency: 300,
      confidenceThreshold: 0.75,
      retrainTrigger: 'Time',
      retrainInterval: 24,
      featureSelection: 'TopN',
      maxFeatures: 50
    });
    setHasUnsavedChanges(false);
    toast({
      title: "Configuration Reset",
      description: "All settings have been reset to default values.",
    });
  };

  const markAsChanged = () => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Strategy Configuration</h1>
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && (
            <Badge variant="destructive" className="gap-2">
              <Activity className="h-4 w-4" />
              Unsaved Changes
            </Badge>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetConfig}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSaveConfig} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="trading" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trading" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Trading Parameters
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <Shield className="h-4 w-4" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="model" className="gap-2">
            <Brain className="h-4 w-4" />
            ML Model Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <Card className="trading-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Core Trading Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="trading-enabled">Enable Trading</Label>
                  <p className="text-xs text-muted-foreground">Master switch for all trading operations</p>
                </div>
                <Switch
                  id="trading-enabled"
                  checked={tradingConfig.enabled}
                  onCheckedChange={(checked) => {
                    setTradingConfig(prev => ({ ...prev, enabled: checked }));
                    markAsChanged();
                  }}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="position-size">Position Size (USD)</Label>
                  <Input
                    id="position-size"
                    type="number"
                    value={tradingConfig.positionSize}
                    onChange={(e) => {
                      setTradingConfig(prev => ({ ...prev, positionSize: parseInt(e.target.value) || 0 }));
                      markAsChanged();
                    }}
                    min={100}
                    max={10000}
                  />
                  <p className="text-xs text-muted-foreground">
                    USD amount per individual position
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-positions">Maximum Positions</Label>
                  <Select 
                    value={tradingConfig.maxPositions.toString()}
                    onValueChange={(value) => {
                      setTradingConfig(prev => ({ ...prev, maxPositions: parseInt(value) }));
                      markAsChanged();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Position</SelectItem>
                      <SelectItem value="3">3 Positions</SelectItem>
                      <SelectItem value="5">5 Positions</SelectItem>
                      <SelectItem value="8">8 Positions</SelectItem>
                      <SelectItem value="10">10 Positions</SelectItem>
                      <SelectItem value="15">15 Positions</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Maximum concurrent open positions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardHeader>
              <CardTitle>ML Prediction Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Threshold Mode</Label>
                <Select 
                  value={tradingConfig.thresholdMode}
                  onValueChange={(value: 'OptimalROC' | 'Percentile' | 'ZeroCrossover') => {
                    setTradingConfig(prev => ({ ...prev, thresholdMode: value }));
                    markAsChanged();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OptimalROC">Optimal ROC</SelectItem>
                    <SelectItem value="Percentile">Percentile Based</SelectItem>
                    <SelectItem value="ZeroCrossover">Zero Crossover</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Method for determining entry thresholds
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Long Entry Threshold: {tradingConfig.longThreshold.toFixed(2)}</Label>
                  <Slider
                    value={[tradingConfig.longThreshold]}
                    onValueChange={([value]) => {
                      setTradingConfig(prev => ({ ...prev, longThreshold: value }));
                      markAsChanged();
                    }}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    ML prediction threshold for opening long positions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Short Entry Threshold: {tradingConfig.shortThreshold.toFixed(2)}</Label>
                  <Slider
                    value={[Math.abs(tradingConfig.shortThreshold)]}
                    onValueChange={([value]) => {
                      setTradingConfig(prev => ({ ...prev, shortThreshold: -value }));
                      markAsChanged();
                    }}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    ML prediction threshold for opening short positions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Stop Loss Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="use-stop-loss">Enable Stop Loss</Label>
                  <p className="text-xs text-muted-foreground">Automatic stop loss protection</p>
                </div>
                <Switch
                  id="use-stop-loss"
                  checked={riskConfig.useStopLoss}
                  onCheckedChange={(checked) => {
                    setRiskConfig(prev => ({ ...prev, useStopLoss: checked }));
                    markAsChanged();
                  }}
                />
              </div>

              {riskConfig.useStopLoss && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Stop Loss Percentage: {riskConfig.stopLossPct}%</Label>
                      <Slider
                        value={[riskConfig.stopLossPct]}
                        onValueChange={([value]) => {
                          setRiskConfig(prev => ({ ...prev, stopLossPct: value }));
                          markAsChanged();
                        }}
                        min={1}
                        max={10}
                        step={0.5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Stop Loss Cooldown (bars): {riskConfig.stopLossCooldownBars}</Label>
                      <Slider
                        value={[riskConfig.stopLossCooldownBars]}
                        onValueChange={([value]) => {
                          setRiskConfig(prev => ({ ...prev, stopLossCooldownBars: value }));
                          markAsChanged();
                        }}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="use-atr-stops">ATR-Based Stops</Label>
                      <p className="text-xs text-muted-foreground">Use Average True Range for dynamic stops</p>
                    </div>
                    <Switch
                      id="use-atr-stops"
                      checked={riskConfig.useATRStops}
                      onCheckedChange={(checked) => {
                        setRiskConfig(prev => ({ ...prev, useATRStops: checked }));
                        markAsChanged();
                      }}
                    />
                  </div>

                  {riskConfig.useATRStops && (
                    <div className="space-y-2">
                      <Label>ATR Multiplier: {riskConfig.atrMultiplier}</Label>
                      <Slider
                        value={[riskConfig.atrMultiplier]}
                        onValueChange={([value]) => {
                          setRiskConfig(prev => ({ ...prev, atrMultiplier: value }));
                          markAsChanged();
                        }}
                        min={1}
                        max={5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Take Profit Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="use-take-profit">Enable Take Profit</Label>
                  <p className="text-xs text-muted-foreground">Automatic profit taking</p>
                </div>
                <Switch
                  id="use-take-profit"
                  checked={riskConfig.useTakeProfit}
                  onCheckedChange={(checked) => {
                    setRiskConfig(prev => ({ ...prev, useTakeProfit: checked }));
                    markAsChanged();
                  }}
                />
              </div>

              {riskConfig.useTakeProfit && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Take Profit Percentage: {riskConfig.takeProfitPct}%</Label>
                      <Slider
                        value={[riskConfig.takeProfitPct]}
                        onValueChange={([value]) => {
                          setRiskConfig(prev => ({ ...prev, takeProfitPct: value }));
                          markAsChanged();
                        }}
                        min={2}
                        max={20}
                        step={0.5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="trailing-stop">Trailing Stop</Label>
                          <p className="text-xs text-muted-foreground">Follow price movement</p>
                        </div>
                        <Switch
                          id="trailing-stop"
                          checked={riskConfig.trailingStopEnabled}
                          onCheckedChange={(checked) => {
                            setRiskConfig(prev => ({ ...prev, trailingStopEnabled: checked }));
                            markAsChanged();
                          }}
                        />
                      </div>
                      {riskConfig.trailingStopEnabled && (
                        <div className="space-y-2">
                          <Label>Trailing Stop %: {riskConfig.trailingStopPct}%</Label>
                          <Slider
                            value={[riskConfig.trailingStopPct]}
                            onValueChange={([value]) => {
                              setRiskConfig(prev => ({ ...prev, trailingStopPct: value }));
                              markAsChanged();
                            }}
                            min={0.5}
                            max={5}
                            step={0.1}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-6">
          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Model Update Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Update Frequency (seconds): {modelConfig.updateFrequency}</Label>
                  <Slider
                    value={[modelConfig.updateFrequency]}
                    onValueChange={([value]) => {
                      setModelConfig(prev => ({ ...prev, updateFrequency: value }));
                      markAsChanged();
                    }}
                    min={60}
                    max={900}
                    step={30}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How often to generate new predictions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Confidence Threshold: {modelConfig.confidenceThreshold}</Label>
                  <Slider
                    value={[modelConfig.confidenceThreshold]}
                    onValueChange={([value]) => {
                      setModelConfig(prev => ({ ...prev, confidenceThreshold: value }));
                      markAsChanged();
                    }}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum confidence required for predictions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Model Retraining</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Retrain Trigger</Label>
                <Select 
                  value={modelConfig.retrainTrigger}
                  onValueChange={(value: 'Time' | 'Performance' | 'DataDrift') => {
                    setModelConfig(prev => ({ ...prev, retrainTrigger: value }));
                    markAsChanged();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Time">Time-based</SelectItem>
                    <SelectItem value="Performance">Performance-based</SelectItem>
                    <SelectItem value="DataDrift">Data Drift Detection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Retrain Interval (hours): {modelConfig.retrainInterval}</Label>
                <Slider
                  value={[modelConfig.retrainInterval]}
                  onValueChange={([value]) => {
                    setModelConfig(prev => ({ ...prev, retrainInterval: value }));
                    markAsChanged();
                  }}
                  min={6}
                  max={168}
                  step={6}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Feature Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Feature Selection Method</Label>
                <Select 
                  value={modelConfig.featureSelection}
                  onValueChange={(value: 'All' | 'TopN' | 'Importance') => {
                    setModelConfig(prev => ({ ...prev, featureSelection: value }));
                    markAsChanged();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Use All Features</SelectItem>
                    <SelectItem value="TopN">Top N Features</SelectItem>
                    <SelectItem value="Importance">Importance Threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modelConfig.featureSelection === 'TopN' && (
                <div className="space-y-2">
                  <Label>Maximum Features: {modelConfig.maxFeatures}</Label>
                  <Slider
                    value={[modelConfig.maxFeatures]}
                    onValueChange={([value]) => {
                      setModelConfig(prev => ({ ...prev, maxFeatures: value }));
                      markAsChanged();
                    }}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}