
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  Zap, 
  FileText, 
  Shield, 
  X,
  AlertTriangle,
  Play,
  Pause
} from "lucide-react";

export const Settings = () => {
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxApplicationsPerWeek, setMaxApplicationsPerWeek] = useState([5]);
  const [apiKey, setApiKey] = useState("");
  const [cvLength, setCvLength] = useState("1");
  const [alwaysInclude, setAlwaysInclude] = useState<string[]>(["ml-recommendation-engine"]);
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>(["Meta", "Amazon"]);
  const [isJobSearchActive, setIsJobSearchActive] = useState(false);

  const costPerApplication = 0.05;
  const estimatedWeeklyCost = maxApplicationsPerWeek[0] * costPerApplication;

  const availableAssets = [
    "ml-recommendation-engine",
    "react-dashboard-framework", 
    "distributed-systems-lab",
    "Efficient Neural Architecture Search for Computer Vision",
    "Scalable Distributed Training of Deep Neural Networks"
  ];

  const handleRemoveAlwaysInclude = (asset: string) => {
    setAlwaysInclude(prev => prev.filter(a => a !== asset));
  };

  const handleRemoveExcludedCompany = (company: string) => {
    setExcludedCompanies(prev => prev.filter(c => c !== company));
  };

  const handleSaveSettings = () => {
    console.log("Saving settings:", {
      requireApproval,
      maxApplicationsPerWeek: maxApplicationsPerWeek[0],
      apiKey,
      cvLength,
      alwaysInclude,
      excludedCompanies,
      isJobSearchActive
    });
  };

  const handleStartJobSearch = () => {
    setIsJobSearchActive(true);
    console.log("Starting job search automation");
  };

  const handleStopJobSearch = () => {
    setIsJobSearchActive(false);
    console.log("Stopping job search automation");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings & Configuration</h1>
        <p className="text-muted-foreground">
          Configure automation, costs, and CV preferences
        </p>
      </div>

      {/* Job Search Control */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            {isJobSearchActive ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            Job Search Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">
                {isJobSearchActive ? "Job Search Active" : "Job Search Paused"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isJobSearchActive 
                  ? "AutoApply is actively searching and applying to jobs" 
                  : "AutoApply is not sending any applications"
                }
              </p>
            </div>
            <div className="flex gap-2">
              {isJobSearchActive ? (
                <Button 
                  variant="destructive" 
                  onClick={handleStopJobSearch}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Applications
                </Button>
              ) : (
                <Button 
                  onClick={handleStartJobSearch}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Applications
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Automation Control */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5" />
              Automation Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground font-medium">Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Review each application before sending
                </p>
              </div>
              <Switch
                checked={requireApproval}
                onCheckedChange={setRequireApproval}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">Maximum Applications per Week</Label>
                <span className="text-primary font-medium">{maxApplicationsPerWeek[0]}</span>
              </div>
              <Slider
                value={maxApplicationsPerWeek}
                onValueChange={setMaxApplicationsPerWeek}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Limit automation to prevent overwhelming potential employers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <DollarSign className="w-5 h-5" />
              Cost Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">API Key</Label>
              <Input
                type="password"
                placeholder="Enter your LLM API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-input border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Used for CV generation and job description analysis
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Cost per Application</span>
                  <span className="text-foreground font-medium">${costPerApplication.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Maximum Weekly Cost</span>
                  <span className="text-primary font-bold">${estimatedWeeklyCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CV Preferences */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5" />
              CV Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-foreground font-medium">Target CV Length</Label>
              <Select value={cvLength} onValueChange={setCvLength}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Page</SelectItem>
                  <SelectItem value="2">2 Pages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground font-medium">Always Include</Label>
              <p className="text-sm text-muted-foreground">
                Assets to include in every CV
              </p>
              <div className="flex flex-wrap gap-2">
                {alwaysInclude.map((asset) => (
                  <Badge key={asset} variant="default" className="flex items-center gap-1 bg-primary">
                    {asset}
                    <button
                      onClick={() => handleRemoveAlwaysInclude(asset)}
                      className="ml-1 hover:bg-primary/80 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Add mandatory asset" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets
                    .filter(asset => !alwaysInclude.includes(asset))
                    .map((asset) => (
                      <SelectItem key={asset} value={asset}>
                        {asset}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5" />
              Excluded Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {excludedCompanies.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  These companies will not receive applications
                </p>
                <div className="flex flex-wrap gap-2">
                  {excludedCompanies.map((company) => (
                    <Badge key={company} variant="destructive" className="flex items-center gap-1">
                      {company}
                      <button
                        onClick={() => handleRemoveExcludedCompany(company)}
                        className="ml-1 hover:bg-destructive/80 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No companies excluded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warning Section */}
      {!requireApproval && isJobSearchActive && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h3 className="text-destructive font-medium mb-1">Automation Enabled</h3>
                <p className="text-sm text-destructive/80">
                  Applications will be sent automatically without manual approval. 
                  Make sure your preferences and excluded companies are correctly configured.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="bg-primary hover:bg-primary/90">
          Save Configuration
        </Button>
      </div>
    </div>
  );
};
