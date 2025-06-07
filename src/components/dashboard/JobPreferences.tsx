
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export const JobPreferences = () => {
  const [jobTitles, setJobTitles] = useState<string[]>(["Software Engineer", "Full Stack Developer"]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [location, setLocation] = useState("Remote");
  const [salaryRange, setSalaryRange] = useState([80000]);
  const [currency, setCurrency] = useState("USD");
  const [preferredKeywords, setPreferredKeywords] = useState<string[]>(["React", "TypeScript", "Node.js"]);
  const [newPreferredKeyword, setNewPreferredKeyword] = useState("");
  const [avoidKeywords, setAvoidKeywords] = useState<string[]>(["PHP", "Cold calling"]);
  const [newAvoidKeyword, setNewAvoidKeyword] = useState("");

  const handleAddJobTitle = () => {
    if (newJobTitle.trim() && !jobTitles.includes(newJobTitle.trim())) {
      setJobTitles([...jobTitles, newJobTitle.trim()]);
      setNewJobTitle("");
    }
  };

  const handleRemoveJobTitle = (title: string) => {
    setJobTitles(jobTitles.filter(t => t !== title));
  };

  const handleAddPreferredKeyword = () => {
    if (newPreferredKeyword.trim() && !preferredKeywords.includes(newPreferredKeyword.trim())) {
      setPreferredKeywords([...preferredKeywords, newPreferredKeyword.trim()]);
      setNewPreferredKeyword("");
    }
  };

  const handleRemovePreferredKeyword = (keyword: string) => {
    setPreferredKeywords(preferredKeywords.filter(k => k !== keyword));
  };

  const handleAddAvoidKeyword = () => {
    if (newAvoidKeyword.trim() && !avoidKeywords.includes(newAvoidKeyword.trim())) {
      setAvoidKeywords([...avoidKeywords, newAvoidKeyword.trim()]);
      setNewAvoidKeyword("");
    }
  };

  const handleRemoveAvoidKeyword = (keyword: string) => {
    setAvoidKeywords(avoidKeywords.filter(k => k !== keyword));
  };

  const handleSavePreferences = () => {
    console.log("Saving preferences:", {
      jobTitles,
      location,
      salaryRange: salaryRange[0],
      currency,
      preferredKeywords,
      avoidKeywords
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Job Preferences</h1>
        <p className="text-gray-400">
          Define your ideal job criteria to improve application targeting
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Job Titles */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Job Titles</CardTitle>
            <p className="text-sm text-gray-400">
              Roles you're interested in applying for
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Senior Software Engineer"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddJobTitle()}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddJobTitle} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {jobTitles.map((title) => (
                <Badge key={title} variant="secondary" className="flex items-center gap-1">
                  {title}
                  <button
                    onClick={() => handleRemoveJobTitle(title)}
                    className="ml-1 hover:bg-gray-600 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Location</CardTitle>
            <p className="text-sm text-gray-400">
              Where you'd like to work
            </p>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., Remote, San Francisco, New York"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </CardContent>
        </Card>

        {/* Salary Expectations */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Salary Expectations</CardTitle>
            <p className="text-sm text-gray-400">
              Minimum salary you're looking for
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Minimum Salary</Label>
                <span className="text-white font-medium">
                  {currency} {salaryRange[0].toLocaleString()}
                </span>
              </div>
              <Slider
                value={salaryRange}
                onValueChange={setSalaryRange}
                max={300000}
                min={30000}
                step={5000}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["USD", "EUR", "GBP"].map((curr) => (
                <Button
                  key={curr}
                  variant={currency === curr ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrency(curr)}
                >
                  {curr}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Keywords */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Preferred Keywords</CardTitle>
            <p className="text-sm text-gray-400">
              Technologies and skills you want to work with
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., React, Machine Learning"
                value={newPreferredKeyword}
                onChange={(e) => setNewPreferredKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPreferredKeyword()}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddPreferredKeyword} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferredKeywords.map((keyword) => (
                <Badge key={keyword} variant="default" className="flex items-center gap-1 bg-green-600">
                  {keyword}
                  <button
                    onClick={() => handleRemovePreferredKeyword(keyword)}
                    className="ml-1 hover:bg-green-700 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Keywords to Avoid */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Keywords to Avoid</CardTitle>
            <p className="text-sm text-gray-400">
              Technologies, roles, or requirements you want to avoid
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Sales, Cold calling, Legacy systems"
                value={newAvoidKeyword}
                onChange={(e) => setNewAvoidKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAvoidKeyword()}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddAvoidKeyword} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {avoidKeywords.map((keyword) => (
                <Badge key={keyword} variant="destructive" className="flex items-center gap-1">
                  {keyword}
                  <button
                    onClick={() => handleRemoveAvoidKeyword(keyword)}
                    className="ml-1 hover:bg-red-600 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSavePreferences} className="bg-blue-600 hover:bg-blue-700">
          Save Preferences
        </Button>
      </div>
    </div>
  );
};
