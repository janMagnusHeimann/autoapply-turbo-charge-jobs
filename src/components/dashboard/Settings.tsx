
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  Zap, 
  FileText, 
  Shield, 
  X,
  AlertTriangle 
} from "lucide-react";

export const Settings = () => {
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxApplicationsPerWeek, setMaxApplicationsPerWeek] = useState([5]);
  const [apiKey, setApiKey] = useState("");
  const [cvLength, setCvLength] = useState("1");
  const [alwaysInclude, setAlwaysInclude] = useState<string[]>(["ml-recommendation-engine"]);
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>(["Meta", "Amazon"]);

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
      excludedCompanies
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings & Configuration</h1>
        <p className="text-gray-400">
          Configure automation, costs, and CV preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Automation Control */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5" />
              Automation Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white font-medium">Require Approval</Label>
                <p className="text-sm text-gray-400">
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
                <Label className="text-white font-medium">Maximum Applications per Week</Label>
                <span className="text-blue-400 font-medium">{maxApplicationsPerWeek[0]}</span>
              </div>
              <Slider
                value={maxApplicationsPerWeek}
                onValueChange={setMaxApplicationsPerWeek}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-400">
                Limit automation to prevent overwhelming potential employers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Management */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="w-5 h-5" />
              Cost Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white font-medium">API Key</Label>
              <Input
                type="password"
                placeholder="Enter your LLM API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400">
                Used for CV generation and job description analysis
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Cost per Application</span>
                  <span className="text-white font-medium">${costPerApplication.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Maximum Weekly Cost</span>
                  <span className="text-green-400 font-bold">${estimatedWeeklyCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CV Preferences */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5" />
              CV Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-white font-medium">Target CV Length</Label>
              <Select value={cvLength} onValueChange={setCvLength}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Page</SelectItem>
                  <SelectItem value="2">2 Pages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-white font-medium">Always Include</Label>
              <p className="text-sm text-gray-400">
                Assets to include in every CV
              </p>
              <div className="flex flex-wrap gap-2">
                {alwaysInclude.map((asset) => (
                  <Badge key={asset} variant="default" className="flex items-center gap-1 bg-blue-600">
                    {asset}
                    <button
                      onClick={() => handleRemoveAlwaysInclude(asset)}
                      className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5" />
              Excluded Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {excludedCompanies.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  These companies will not receive applications
                </p>
                <div className="flex flex-wrap gap-2">
                  {excludedCompanies.map((company) => (
                    <Badge key={company} variant="destructive" className="flex items-center gap-1">
                      {company}
                      <button
                        onClick={() => handleRemoveExcludedCompany(company)}
                        className="ml-1 hover:bg-red-600 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No companies excluded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warning Section */}
      {!requireApproval && (
        <Card className="bg-orange-900/20 border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
              <div>
                <h3 className="text-orange-400 font-medium mb-1">Automation Enabled</h3>
                <p className="text-sm text-gray-300">
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
        <Button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700">
          Save Configuration
        </Button>
      </div>
    </div>
  );
};
