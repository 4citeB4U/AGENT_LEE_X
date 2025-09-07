"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Search, ExternalLink, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adaptiveLLMSelection } from '@/ai/flows/adaptive-llm-selection-flow';


interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
}

export const SearchPanel: React.FC = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useLLM, setUseLLM] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const { toast } = useToast();

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResults([]);

    try {
        if(useLLM) {
            const llmResult = await adaptiveLLMSelection({ task: 'answer question from search', text: query });
            toast({ title: 'LLM Result', description: <pre className="font-code whitespace-pre-wrap">{JSON.stringify(llmResult, null, 2)}</pre> });
        }

        // Simulate API call for regular search
        setTimeout(() => {
          const mockResults: SearchResult[] = [
            {
              id: '1',
              title: 'Chicago Lakefront Events - Summer 2024',
              url: 'https://example.com/chicago-events',
              snippet: `Results for '${query}': Discover amazing summer events along Chicago's beautiful lakefront including concerts, festivals, and outdoor activities.`
            },
            {
              id: '2',
              title: 'Navy Pier Chicago - Official Website',
              url: 'https://navypier.org',
              snippet: 'Experience Chicago\'s iconic Navy Pier with attractions, dining, shopping, and year-round events on Lake Michigan.'
            },
          ];
          setResults(mockResults);
          setIsLoading(false);
        }, 1000);

    } catch (error) {
        console.error("Search failed:", error);
        toast({
            variant: "destructive",
            title: "Search Error",
            description: "Could not perform search."
        })
        setIsLoading(false);
    }
  };

  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setShowPreview(true);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-luxury h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-gold-primary" />
          <h3 className="font-semibold text-gold-primary">Search</h3>
        </div>
        <div className="text-xs text-gold-muted">
          {results.length} results
        </div>
      </div>

      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center gap-2">
          <Switch 
            id="llm-toggle" 
            checked={useLLM} 
            onCheckedChange={setUseLLM}
          />
          <Label htmlFor="llm-toggle" className="text-xs text-gold-muted">
            Reason w/ LLM (for search summaries)
          </Label>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {showPreview ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-glass-border">
              <span className="text-xs text-gold-muted truncate max-w-xs">{previewUrl}</span>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full bg-white rounded"
              title="Web Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <ScrollArea className="h-full p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-gold-muted">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 border border-glass-border rounded-lg hover:bg-emerald-accent/10 transition-colors cursor-pointer"
                    onClick={() => openPreview(result.url)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-gold-primary hover:underline line-clamp-1">
                        {result.title}
                      </h4>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-4 h-4 text-gold-muted flex-shrink-0" />
                      </a>
                    </div>
                    <p className="text-xs text-gold-muted mt-1 line-clamp-2">
                      {result.snippet}
                    </p>
                    <div className="text-xs text-gold-muted/70 mt-1 truncate">
                      {result.url}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gold-muted">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a search to see results</p>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
