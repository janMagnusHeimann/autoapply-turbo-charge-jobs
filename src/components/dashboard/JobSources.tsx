import { useState, useEffect } from "react";
import { Plus, Trash2, Play, Pause, ExternalLink, AlertCircle, CheckCircle, Clock, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobSource {
  id: string;
  name: string;
  url: string;
  type: 'markdown-table' | 'markdown-list' | 'json' | 'html';
  frequency_hours: number;
  is_active: boolean;
  last_crawled_at: string | null;
  next_crawl_at: string | null;
  created_at: string;
}

interface CrawlHistory {
  id: string;
  source_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  jobs_found: number;
  jobs_inserted: number;
  jobs_updated: number;
  companies_created: number;
  error_message: string | null;
}

export const JobSources = () => {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [crawlHistory, setCrawlHistory] = useState<CrawlHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    type: 'markdown-table' as const,
    frequency_hours: 6
  });

  useEffect(() => {
    fetchSources();
    fetchCrawlHistory();
  }, []);

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from('job_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error fetching job sources:', error);
      toast.error('Failed to fetch job sources');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrawlHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('crawl_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCrawlHistory(data || []);
    } catch (error) {
      console.error('Error fetching crawl history:', error);
    }
  };

  const handleAddSource = async () => {
    if (!newSource.name.trim() || !newSource.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    // Validate URL
    try {
      new URL(newSource.url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_sources')
        .insert({
          name: newSource.name.trim(),
          url: newSource.url.trim(),
          type: newSource.type,
          frequency_hours: newSource.frequency_hours,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setSources(prev => [data, ...prev]);
      setNewSource({ name: '', url: '', type: 'markdown-table', frequency_hours: 6 });
      setAddDialogOpen(false);
      toast.success('Job source added successfully');
    } catch (error) {
      console.error('Error adding job source:', error);
      toast.error('Failed to add job source');
    }
  };

  const toggleSourceActive = async (sourceId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('job_sources')
        .update({ is_active: !isActive })
        .eq('id', sourceId);

      if (error) throw error;

      setSources(prev => prev.map(source => 
        source.id === sourceId ? { ...source, is_active: !isActive } : source
      ));

      toast.success(`Source ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating source:', error);
      toast.error('Failed to update source');
    }
  };

  const deleteSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('job_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;

      setSources(prev => prev.filter(source => source.id !== sourceId));
      toast.success('Job source deleted');
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error('Failed to delete source');
    }
  };

  const crawlSource = async (sourceId: string) => {
    setCrawling(sourceId);
    try {
      // This would trigger the crawler for a specific source
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Crawl started successfully');
      await fetchCrawlHistory();
    } catch (error) {
      console.error('Error starting crawl:', error);
      toast.error('Failed to start crawl');
    } finally {
      setCrawling(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'markdown-table': return '📊';
      case 'markdown-list': return '📋';
      case 'json': return '🔧';
      case 'html': return '🌐';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Sources</h1>
          <p className="text-gray-400">Loading job sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Sources</h1>
          <p className="text-gray-400">
            Manage repositories and websites that the crawler monitors for jobs
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Format Guidelines */}
      <Alert className="bg-gray-800/50 border-gray-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-gray-300">
          <strong>Supported formats:</strong> Markdown tables (GitHub job repos), 
          Markdown lists (company directories), JSON APIs, HTML pages. 
          Best results with GitHub repositories that maintain job listings.
        </AlertDescription>
      </Alert>

      {/* Job Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sources.map((source) => {
          const lastCrawl = crawlHistory.find(h => h.source_id === source.id);
          
          return (
            <Card key={source.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-2xl">
                      {getTypeIcon(source.type)}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{source.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={source.is_active ? "default" : "secondary"} className="text-xs">
                          {source.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="!text-white !border-gray-600 !bg-transparent text-xs">
                          {source.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => crawlSource(source.id)}
                      disabled={crawling === source.id || !source.is_active}
                      className="!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white disabled:!opacity-50 disabled:!text-gray-400"
                    >
                      {crawling === source.id ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSourceActive(source.id, source.is_active)}
                      className={source.is_active ? "!text-white !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white" : "!text-gray-300 !border-gray-600 !bg-transparent hover:!bg-gray-700 hover:!text-white"}
                    >
                      {source.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSource(source.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">URL</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white text-sm flex items-center gap-1 break-all"
                  >
                    {source.url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400">Frequency</p>
                    <p className="text-white">Every {source.frequency_hours}h</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Last Crawl</p>
                    <p className="text-white">
                      {source.last_crawled_at ? formatTimeAgo(source.last_crawled_at) : 'Never'}
                    </p>
                  </div>
                </div>

                {lastCrawl && (
                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${getStatusColor(lastCrawl.status)}`}>
                        {lastCrawl.status.charAt(0).toUpperCase() + lastCrawl.status.slice(1)}
                      </span>
                      <span className="text-gray-400">
                        {lastCrawl.jobs_found} jobs found, {lastCrawl.companies_created} companies added
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sources.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-12">
            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No job sources configured</h3>
            <p className="text-gray-500 mb-4">Add your first job source to start crawling</p>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-gray-700 hover:bg-gray-600 border border-gray-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Crawl History */}
      {crawlHistory.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Crawl History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {crawlHistory.slice(0, 5).map((crawl) => {
                const source = sources.find(s => s.id === crawl.source_id);
                return (
                  <div key={crawl.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{source?.name || 'Unknown Source'}</p>
                      <p className="text-gray-400 text-xs">{formatTimeAgo(crawl.started_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getStatusColor(crawl.status)}`}>
                        {crawl.status.charAt(0).toUpperCase() + crawl.status.slice(1)}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {crawl.jobs_found} jobs, {crawl.companies_created} companies
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Source Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Job Source
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="bg-gray-800/50 border-gray-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-gray-300 text-sm">
                <strong>Format Requirements:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• <strong>Markdown Table:</strong> Must have columns like Company, Role, Location, Application</li>
                  <li>• <strong>Markdown List:</strong> Each line should contain company name and website</li>
                  <li>• <strong>JSON:</strong> API endpoint returning job/company data</li>
                  <li>• <strong>HTML:</strong> Structured web pages with job listings</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-name" className="text-sm text-gray-300">
                  Source Name *
                </Label>
                <Input
                  id="source-name"
                  placeholder="e.g., SimplifyJobs Internships"
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source-type" className="text-sm text-gray-300">
                  Content Type *
                </Label>
                <Select 
                  value={newSource.type} 
                  onValueChange={(value: any) => setNewSource(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="markdown-table" className="text-white hover:bg-gray-700">📊 Markdown Table</SelectItem>
                    <SelectItem value="markdown-list" className="text-white hover:bg-gray-700">📋 Markdown List</SelectItem>
                    <SelectItem value="json" className="text-white hover:bg-gray-700">🔧 JSON API</SelectItem>
                    <SelectItem value="html" className="text-white hover:bg-gray-700">🌐 HTML Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url" className="text-sm text-gray-300">
                Source URL *
              </Label>
              <Input
                id="source-url"
                placeholder="https://raw.githubusercontent.com/user/repo/main/README.md"
                value={newSource.url}
                onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-400">
                For GitHub repos, use the raw URL. For APIs, use the endpoint URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-sm text-gray-300">
                Crawl Frequency (hours)
              </Label>
              <Select 
                value={newSource.frequency_hours.toString()} 
                onValueChange={(value) => setNewSource(prev => ({ ...prev, frequency_hours: parseInt(value) }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="1" className="text-white hover:bg-gray-700">Every hour</SelectItem>
                  <SelectItem value="6" className="text-white hover:bg-gray-700">Every 6 hours</SelectItem>
                  <SelectItem value="12" className="text-white hover:bg-gray-700">Every 12 hours</SelectItem>
                  <SelectItem value="24" className="text-white hover:bg-gray-700">Daily</SelectItem>
                  <SelectItem value="72" className="text-white hover:bg-gray-700">Every 3 days</SelectItem>
                  <SelectItem value="168" className="text-white hover:bg-gray-700">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="!border-gray-600 !text-white !bg-transparent hover:!bg-gray-700 hover:!text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSource}
                disabled={!newSource.name.trim() || !newSource.url.trim()}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};