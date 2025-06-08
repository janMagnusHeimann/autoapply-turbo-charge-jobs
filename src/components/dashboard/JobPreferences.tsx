
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Plus, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { toast } from "sonner";

export const JobPreferences = () => {
  const { user, userPreferences, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [remotePreference, setRemotePreference] = useState<'on-site' | 'remote' | 'hybrid' | 'any'>('any');
  const [salaryRange, setSalaryRange] = useState([80000, 150000]);
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState("");
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (userPreferences) {
      setJobTitles(userPreferences.preferred_job_types || []);
      setLocations(userPreferences.preferred_locations || []);
      setRemotePreference(userPreferences.preferred_remote || 'any');
      setSalaryRange([
        userPreferences.min_salary || 50000,
        userPreferences.max_salary || 200000
      ]);
      setPreferredIndustries(userPreferences.preferred_industries || []);
      setCompanySizes(userPreferences.preferred_company_sizes || []);
      setSkills(userPreferences.skills || []);
      setLoading(false);
    } else if (user) {
      // Set some defaults if no preferences exist yet
      setJobTitles(['Software Engineer', 'Full Stack Developer']);
      setLocations(['Remote']);
      setSkills(['React', 'TypeScript', 'Node.js']);
      setLoading(false);
    }
  }, [userPreferences, user]);

  const handleAddJobTitle = () => {
    if (newJobTitle.trim() && !jobTitles.includes(newJobTitle.trim())) {
      setJobTitles([...jobTitles, newJobTitle.trim()]);
      setNewJobTitle("");
    }
  };

  const handleRemoveJobTitle = (title: string) => {
    setJobTitles(jobTitles.filter(t => t !== title));
  };

  const handleAddLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation("");
    }
  };

  const handleRemoveLocation = (location: string) => {
    setLocations(locations.filter(l => l !== location));
  };

  const handleAddIndustry = () => {
    if (newIndustry.trim() && !preferredIndustries.includes(newIndustry.trim())) {
      setPreferredIndustries([...preferredIndustries, newIndustry.trim()]);
      setNewIndustry("");
    }
  };

  const handleRemoveIndustry = (industry: string) => {
    setPreferredIndustries(preferredIndustries.filter(i => i !== industry));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleCompanySizeToggle = (size: string) => {
    if (companySizes.includes(size)) {
      setCompanySizes(companySizes.filter(s => s !== size));
    } else {
      setCompanySizes([...companySizes, size]);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await UserService.updateUserPreferences(user.id, {
        preferred_job_types: jobTitles,
        preferred_locations: locations,
        preferred_remote: remotePreference,
        min_salary: salaryRange[0],
        max_salary: salaryRange[1],
        preferred_industries: preferredIndustries,
        preferred_company_sizes: companySizes,
        skills: skills
      });

      await refreshUserData();
      toast.success("Preferences saved successfully!");
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Preferences</h1>
          <p className="text-gray-400">Loading your preferences...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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

        {/* Locations */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Preferred Locations</CardTitle>
            <p className="text-sm text-gray-400">
              Cities or regions you'd like to work in
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., San Francisco, Remote"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddLocation} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <Badge key={location} variant="secondary" className="flex items-center gap-1">
                  {location}
                  <button
                    onClick={() => handleRemoveLocation(location)}
                    className="ml-1 hover:bg-gray-600 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Remote Work Preference */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Remote Work Preference</CardTitle>
            <p className="text-sm text-gray-400">
              Your preference for remote work arrangements
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'on-site', label: 'On-site Only' },
                { value: 'remote', label: 'Remote Only' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'any', label: 'Any' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={remotePreference === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRemotePreference(option.value as any)}
                  className={remotePreference === option.value ? "bg-gray-600" : ""}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary Range */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Salary Range (USD)</CardTitle>
            <p className="text-sm text-gray-400">
              Your preferred salary range
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Salary Range</Label>
                <span className="text-white font-medium">
                  ${salaryRange[0].toLocaleString()} - ${salaryRange[1].toLocaleString()}
                </span>
              </div>
              <div className="px-3">
                <Slider
                  value={salaryRange}
                  onValueChange={setSalaryRange}
                  max={500000}
                  min={30000}
                  step={5000}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>$30k</span>
                <span>$500k</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Industries */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Preferred Industries</CardTitle>
            <p className="text-sm text-gray-400">
              Industries you're interested in working in
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Technology, Healthcare, Finance"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddIndustry()}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddIndustry} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferredIndustries.map((industry) => (
                <Badge key={industry} variant="default" className="flex items-center gap-1 bg-purple-600">
                  {industry}
                  <button
                    onClick={() => handleRemoveIndustry(industry)}
                    className="ml-1 hover:bg-purple-700 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Company Sizes */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Company Sizes</CardTitle>
            <p className="text-sm text-gray-400">
              Preferred company sizes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'startup', label: 'Startup (1-50)' },
                { value: 'small', label: 'Small (51-200)' },
                { value: 'medium', label: 'Medium (201-1000)' },
                { value: 'large', label: 'Large (1001-5000)' },
                { value: 'enterprise', label: 'Enterprise (5000+)' }
              ].map((size) => (
                <Button
                  key={size.value}
                  variant={companySizes.includes(size.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCompanySizeToggle(size.value)}
                  className={companySizes.includes(size.value) ? "bg-gray-600" : ""}
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Skills & Technologies</CardTitle>
            <p className="text-sm text-gray-400">
              Technologies, frameworks, and skills you want to work with
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., React, Python, Machine Learning, AWS"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddSkill} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="default" className="flex items-center gap-1 bg-gray-600">
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 hover:bg-gray-700 rounded-full p-0.5"
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
        <Button 
          onClick={handleSavePreferences} 
          disabled={saving}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
