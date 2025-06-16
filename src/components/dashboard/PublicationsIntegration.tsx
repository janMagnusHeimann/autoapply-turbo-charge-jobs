import { useState, useEffect } from "react";
import { 
  GraduationCap, 
  ExternalLink, 
  Quote, 
  Calendar, 
  RefreshCw, 
  Unlink, 
  BookOpen, 
  Save,
  CheckCircle,
  Circle,
  Info,
  Loader2,
  Users,
  Trophy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { 
  GoogleScholarService, 
  GoogleScholarPublication, 
  GoogleScholarAuthor,
  GoogleScholarConnection 
} from "@/services/googleScholarService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PublicationsIntegrationProps {
  onPublicationsSync?: () => void;
}

interface PublicationWithSelection extends GoogleScholarPublication {
  isSelected: boolean;
  userDescription: string;
}

export const PublicationsIntegration = ({ onPublicationsSync }: PublicationsIntegrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [publications, setPublications] = useState<PublicationWithSelection[]>([]);
  const [scholarAuthor, setScholarAuthor] = useState<GoogleScholarAuthor | null>(null);
  const [connection, setConnection] = useState<GoogleScholarConnection | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  
  // UI states
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    checkConnection();
  }, [user]);

  useEffect(() => {
    const selected = publications.filter(pub => pub.isSelected);
    setSelectedCount(selected.length);
    
    // Check if there are unsaved changes by comparing with saved state
    checkForUnsavedChanges();
  }, [publications]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const connected = await GoogleScholarService.isScholarConnected(user.id);
      setIsConnected(connected);

      if (connected) {
        await loadScholarData();
      }
    } catch (error) {
      console.error('Error checking Google Scholar connection:', error);
      toast({
        title: "Connection Error",
        description: "Failed to check Google Scholar connection status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadScholarData = async () => {
    if (!user) return;

    try {
      console.log('🔄 Loading Google Scholar data for user:', user.id);
      
      const [connectionData, savedPublications] = await Promise.all([
        GoogleScholarService.getScholarConnection(user.id),
        GoogleScholarService.getSelectedPublications(user.id)
      ]);

      if (connectionData) {
        setConnection(connectionData);
        
        // Convert connection data to author format for display
        const authorData: GoogleScholarAuthor = {
          name: connectionData.author_name || '',
          affiliation: connectionData.author_affiliation,
          email: connectionData.author_email,
          total_citations: connectionData.total_citations,
          h_index: connectionData.h_index,
          i10_index: connectionData.i10_index,
          profile_url: connectionData.scholar_profile_url,
          author_id: connectionData.scholar_author_id || '',
        };
        setScholarAuthor(authorData);

        // Use the actual scraper to get real/improved publications
        console.log('🔄 Scraping publications from profile:', connectionData.scholar_profile_url);
        
        const { author: scrapedAuthor, publications: scrapedPublications } = await GoogleScholarService.scrapeScholarProfile(connectionData.scholar_profile_url);
        
        // Update author data with freshly scraped info
        setScholarAuthor(scrapedAuthor);
        
        const pubsWithSelection = await GoogleScholarService.getPublicationsWithSelectionStatus(user.id, scrapedPublications);
        setPublications(pubsWithSelection);
        setStats(GoogleScholarService.getPublicationStats(scrapedPublications));
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading Google Scholar data:', error);
      toast({
        title: "Error loading publications",
        description: "Failed to fetch your Google Scholar information. Please try reconnecting.",
        variant: "destructive",
      });
    }
  };

  const checkForUnsavedChanges = async () => {
    if (!user || publications.length === 0) return;
    
    try {
      const savedPubs = await GoogleScholarService.getSelectedPublications(user.id);
      const savedMap = new Map(savedPubs.map(pub => [pub.scholar_publication_id, pub]));
      
      const hasChanges = publications.some(pub => {
        const saved = savedMap.get(pub.id);
        return pub.isSelected !== (saved?.is_selected || false) ||
               pub.userDescription !== (saved?.user_description || '');
      });
      
      setHasUnsavedChanges(hasChanges);
    } catch (error) {
      console.error('Error checking for unsaved changes:', error);
    }
  };

  const handleConnect = async () => {
    if (!profileUrl.trim()) {
      toast({
        title: "Profile URL Required",
        description: "Please enter your Google Scholar profile URL.",
        variant: "destructive",
      });
      return;
    }

    if (!GoogleScholarService.validateProfileUrl(profileUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Scholar profile URL (e.g., https://scholar.google.com/citations?user=YOUR_ID).",
        variant: "destructive",
      });
      return;
    }

    try {
      setConnecting(true);
      
      const { author, publications: scrapedPublications } = await GoogleScholarService.scrapeScholarProfile(profileUrl);
      
      await GoogleScholarService.storeScholarConnection(user!.id, author);
      
      setScholarAuthor(author);
      setIsConnected(true);
      
      const pubsWithSelection = await GoogleScholarService.getPublicationsWithSelectionStatus(user!.id, scrapedPublications);
      setPublications(pubsWithSelection);
      setStats(GoogleScholarService.getPublicationStats(scrapedPublications));
      
      toast({
        title: "Connected successfully",
        description: `Connected to ${author.name}'s Google Scholar profile with ${scrapedPublications.length} publications.`,
      });

      onPublicationsSync?.();
    } catch (error: any) {
      console.error('Error connecting to Google Scholar:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Google Scholar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!user || !connection) return;

    try {
      setSyncing(true);
      
      const { publications: scrapedPublications } = await GoogleScholarService.scrapeScholarProfile(connection.scholar_profile_url);
      const pubsWithSelection = await GoogleScholarService.getPublicationsWithSelectionStatus(user.id, scrapedPublications);

      setPublications(pubsWithSelection);
      setStats(GoogleScholarService.getPublicationStats(scrapedPublications));

      toast({
        title: "Publications synced",
        description: `Successfully synced ${scrapedPublications.length} publications from Google Scholar.`,
      });

      onPublicationsSync?.();
    } catch (error) {
      console.error('Error syncing publications:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync publications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePublicationToggle = (pubId: string, isSelected: boolean) => {
    setPublications(prev => prev.map(pub => 
      pub.id === pubId ? { ...pub, isSelected } : pub
    ));
  };

  const handleDescriptionChange = (pubId: string, description: string) => {
    setPublications(prev => prev.map(pub => 
      pub.id === pubId ? { ...pub, userDescription: description } : pub
    ));
  };

  const handleSaveSelections = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      const selectedPubs = publications
        .filter(pub => pub.isSelected)
        .map(pub => ({
          user_id: user.id,
          scholar_publication_id: pub.id,
          title: pub.title,
          authors: pub.authors,
          publication_venue: pub.publication_venue,
          publication_year: pub.publication_year,
          citation_count: pub.citation_count,
          pdf_link: pub.pdf_link,
          scholar_link: pub.scholar_link,
          abstract: pub.abstract,
          user_description: pub.userDescription,
          keywords: pub.keywords,
          is_selected: true,
          publication_type: pub.publication_type,
        }));

      console.log(`💾 Saving ${selectedPubs.length} publications:`, selectedPubs.map(p => p.title));

      await GoogleScholarService.saveSelectedPublications(user.id, selectedPubs);
      
      setHasUnsavedChanges(false);
      
      toast({
        title: "Selections saved",
        description: `Successfully saved ${selectedPubs.length} publications with descriptions.`,
      });

      onPublicationsSync?.();
    } catch (error) {
      console.error('Error saving selections:', error);
      toast({
        title: "Save failed",
        description: "Failed to save publication selections. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      await GoogleScholarService.disconnectScholar(user.id);
      setIsConnected(false);
      setScholarAuthor(null);
      setConnection(null);
      setPublications([]);
      setStats(null);
      setHasUnsavedChanges(false);
      setProfileUrl("");

      toast({
        title: "Google Scholar disconnected",
        description: "Your Google Scholar account has been disconnected and all data removed.",
      });

      onPublicationsSync?.();
    } catch (error) {
      console.error('Error disconnecting Google Scholar:', error);
      toast({
        title: "Disconnect failed",
        description: "Failed to disconnect Google Scholar. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-white" />
            <CardTitle className="text-white">Google Scholar Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4 bg-gray-700" />
            <Skeleton className="h-4 w-1/2 bg-gray-700" />
            <Skeleton className="h-10 w-32 bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-white" />
            <CardTitle className="text-white">Google Scholar Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-gray-800 border-gray-700">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-gray-300">
              Connect your Google Scholar profile to import your publications and add descriptions for CV generation and job applications.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">What you can do:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Import your published research papers and citations</li>
              <li>• Select specific publications to highlight in your professional profile</li>
              <li>• Add detailed descriptions of your research contributions and impact</li>
              <li>• Showcase your academic achievements and expertise</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-url" className="text-sm font-medium text-white">
                Google Scholar Profile URL
              </Label>
              <Input
                id="profile-url"
                placeholder="https://scholar.google.com/citations?user=YOUR_ID"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                className="mt-2 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Find your profile URL by visiting Google Scholar and copying the URL from your profile page.
              </p>
            </div>
            
            <Button 
              onClick={handleConnect} 
              disabled={connecting || !profileUrl.trim()}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GraduationCap className="h-4 w-4 mr-2" />
              )}
              {connecting ? 'Connecting...' : 'Connect Google Scholar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scholar Account Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Google Scholar Profile</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-white ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scholarAuthor && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-white text-lg">
                  {scholarAuthor.name}
                </h3>
                {scholarAuthor.affiliation && (
                  <p className="text-sm text-gray-400">{scholarAuthor.affiliation}</p>
                )}
                {scholarAuthor.email && (
                  <p className="text-sm text-gray-400">{scholarAuthor.email}</p>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{scholarAuthor.total_citations}</div>
                  <div className="text-xs text-gray-400">Total Citations</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{scholarAuthor.h_index}</div>
                  <div className="text-xs text-gray-400">h-index</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{scholarAuthor.i10_index}</div>
                  <div className="text-xs text-gray-400">i10-index</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Publication Portfolio
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {selectedCount} of {publications.length} selected
              </span>
              {hasUnsavedChanges && (
                <Button
                  onClick={handleSaveSelections}
                  disabled={saving || selectedCount === 0}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                  ) : (
                    <Save className="h-4 w-4 mr-2 text-white" />
                  )}
                  {saving ? 'Saving...' : 'Save Selections'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasUnsavedChanges && (
            <Alert className="mb-4 bg-gray-800 border-gray-700">
              <Info className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-gray-300">
                You have unsaved changes. Click "Save Selections" to save your publication choices and descriptions.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-sm text-gray-400 mb-4">
            Select publications you want to include in your professional portfolio. Add descriptions explaining your research contribution, methodology, and impact of each paper.
          </p>

          {/* Selected Publications Summary */}
          {selectedCount > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">Selected Publications:</h4>
              <div className="space-y-2">
                {publications
                  .filter(pub => pub.isSelected)
                  .map((pub) => (
                    <div
                      key={pub.id}
                      className="flex items-start justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm text-white line-clamp-1">{pub.title}</h5>
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-gray-800">
                            {pub.publication_type}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Quote className="h-3 w-3" />
                            {pub.citation_count}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {pub.userDescription || pub.abstract || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publication Selection List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BookOpen className="h-5 w-5 text-blue-400" />
            Select Your Best Publications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className={`border rounded-lg p-4 transition-all ${
                  pub.isSelected ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="space-y-4">
                  {/* Publication Header */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`pub-${pub.id}`}
                      checked={pub.isSelected}
                      onCheckedChange={(checked) => 
                        handlePublicationToggle(pub.id, checked as boolean)
                      }
                      className="mt-1 border-gray-600 bg-gray-800 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <Label
                            htmlFor={`pub-${pub.id}`}
                            className="font-medium cursor-pointer text-white block"
                          >
                            {pub.title}
                          </Label>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="border-gray-600 text-gray-300 bg-gray-800">
                              {pub.publication_type}
                            </Badge>
                            {pub.publication_venue && (
                              <Badge variant="secondary" className="bg-blue-600 text-white">
                                {pub.publication_venue}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Users className="h-3 w-3" />
                            <span>{pub.authors.join(', ')}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                          asChild
                        >
                          <a
                            href={pub.scholar_link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                      
                      {pub.abstract && (
                        <p className="text-sm text-gray-400">
                          {pub.abstract}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Quote className="h-3 w-3" />
                          {pub.citation_count} citations
                        </div>
                        {pub.publication_year && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {pub.publication_year}
                          </div>
                        )}
                        {pub.pdf_link && (
                          <a 
                            href={pub.pdf_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            PDF
                          </a>
                        )}
                      </div>
                      
                      {pub.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pub.keywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description Input - Only show when selected */}
                  {pub.isSelected && (
                    <div className="ml-8 space-y-2">
                      <Label htmlFor={`desc-${pub.id}`} className="text-sm font-medium text-white">
                        Describe your research contribution and impact *
                      </Label>
                      <Textarea
                        id={`desc-${pub.id}`}
                        placeholder="Explain your role in the research, methodology used, key findings, and impact achieved. This will be used in your CV and job applications. E.g., 'Led research on novel machine learning algorithms for image recognition, achieving 95% accuracy on benchmark datasets. Developed open-source framework adopted by 500+ researchers worldwide.'"
                        value={pub.userDescription}
                        onChange={(e) => handleDescriptionChange(pub.id, e.target.value)}
                        className="min-h-[100px] resize-none bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        required={pub.isSelected}
                      />
                      <p className="text-xs text-gray-400">
                        Focus on: your specific contribution, research methodology, key findings, measurable impact, and recognition received.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {publications.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">No publications found</h3>
              <p className="text-gray-400 mb-4">
                Click "Sync" to fetch your latest publications from Google Scholar.
              </p>
              <Button onClick={handleSync} disabled={syncing} className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
                <RefreshCw className={`h-4 w-4 mr-2 text-white ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Publications'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions */}
      {selectedCount > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">Ready to save your research portfolio?</h4>
                <p className="text-sm text-gray-400">
                  {selectedCount} publications selected with descriptions
                </p>
              </div>
              <Button
                onClick={handleSaveSelections}
                disabled={saving || !hasUnsavedChanges}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                ) : (
                  <Save className="h-4 w-4 mr-2 text-white" />
                )}
                {saving ? 'Saving Portfolio...' : hasUnsavedChanges ? 'Save Portfolio' : 'Portfolio Saved'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};