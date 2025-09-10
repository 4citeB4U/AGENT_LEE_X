"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Search, ExternalLink, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adaptiveLLMSelection } from '@/ai/flows/adaptive-llm-selection-flow';
import { webSearch } from '@/lib/research/webSearch';
import { searchOpenverse, OpenverseImage } from '@/lib/research/openverse';


interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
}

export const SearchPanel: React.FC = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [summary, setSummary] = useState<string>("");
  const [images, setImages] = useState<OpenverseImage[]>([]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResults([]);
    setSummary("");
    setImages([]);

    try {
        // Always reason with LLM to form a research-oriented summary
        const llmResult = await adaptiveLLMSelection({ task: 'answer question from search', text: query });
        const llmText = typeof llmResult === 'string' ? llmResult : JSON.stringify(llmResult, null, 2);
        setSummary(llmText);

        const data = await webSearch(query);
        setResults(data.map((r, idx) => ({ id: String(idx+1), title: r.title, url: r.url, snippet: r.snippet })));

        // Fetch image thumbnails from Openverse (free, no key)
        const imgs = await searchOpenverse(query, 8).catch(()=>[]);
        setImages(imgs);
        setIsLoading(false);

    } catch (error) {
        console.error("Search failed:", error);
        // Attempt graceful fallback: try web results only and synthesize a simple outline
        try {
          const data = await webSearch(query);
          setResults(data.map((r, idx) => ({ id: String(idx+1), title: r.title, url: r.url, snippet: r.snippet })));
          const outline = data.slice(0, 6).map((r, i) => `${i+1}. ${r.title} — ${r.snippet}`).join("\n\n");
          setSummary(outline ? `Preliminary outline (no LLM available):\n\n${outline}` : "");
        } catch (e2) {
          toast({
            variant: "destructive",
            title: "Search Error",
            description: "Could not perform search."
          });
        }
        setIsLoading(false);
    }
  };

  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setShowPreview(true);
  };

  // Focus search input when global search action is triggered (mic radial button)
  useEffect(() => {
    const onFocus = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('agentlee:focus-search', onFocus as any);
    return () => window.removeEventListener('agentlee:focus-search', onFocus as any);
  }, []);

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

      <div className="p-4 border-b border-glass-border bg-white">
        <div className="mt-3 flex items-center gap-2">
          <Input id="agentlee_search_query" name="agentlee_search_query" ref={inputRef} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Deep research query…" className="bg-white" onKeyDown={(e)=>{ if(e.key==='Enter'){ handleSearch(query); } }} />
          <Button onClick={()=>handleSearch(query)} variant="default">Search</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white">
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
          <ScrollArea className="h-full p-4 bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-gold-muted">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-5">
                {summary && (
                  <div className="p-3 border border-glass-border rounded-lg bg-gray-50">
                    <h4 className="text-sm font-semibold text-gold-primary mb-1">LLM Research Summary</h4>
                    <pre className="text-xs whitespace-pre-wrap text-gold-muted">{summary}</pre>
                  </div>
                )}

                {images.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gold-primary mb-2">Images</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.map(img => (
                        <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={img.thumbnail} alt={img.title} className="w-full h-28 object-cover rounded border border-glass-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 border border-glass-border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
