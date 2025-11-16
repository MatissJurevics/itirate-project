"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mic, 
  Volume2, 
  FileText, 
  Settings, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceGenerationButtonProps {
  dashboardId: string;
  onAudioGenerated?: (audioUrl: string, transcript: string) => void;
  className?: string;
}

interface VoiceGenerationResult {
  success: boolean;
  cached?: boolean;
  audioUrl?: string;
  transcript?: string;
  keyHighlights?: string[];
  analysis?: {
    totalWidgets: number;
    themes: string[];
    estimatedDuration: number;
    wordCount: number;
  };
  voice?: {
    voiceId: string;
    modelId: string;
    style: string;
  };
  error?: string;
  message?: string;
}

interface VoiceStatus {
  dashboardId: string;
  title: string;
  hasAudio: boolean;
  audioUrl?: string | null;
  lastGenerated?: string | null;
  transcript?: string | null;
}

export function VoiceGenerationButton({ dashboardId, onAudioGenerated, className }: VoiceGenerationButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false);
  const [voiceStatus, setVoiceStatus] = React.useState<VoiceStatus | null>(null);
  const [result, setResult] = React.useState<VoiceGenerationResult | null>(null);
  
  // Voice generation settings
  const [maxDuration, setMaxDuration] = React.useState([3]);
  const [voiceStyle, setVoiceStyle] = React.useState<'professional' | 'conversational' | 'analytical'>('professional');
  const [forceRegenerate, setForceRegenerate] = React.useState(false);

  const { toast } = useToast();

  // Check existing voice status when dialog opens
  React.useEffect(() => {
    if (isOpen && !voiceStatus) {
      checkVoiceStatus();
    }
  }, [isOpen]);

  const checkVoiceStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/generate-voice`);
      if (response.ok) {
        const status: VoiceStatus = await response.json();
        setVoiceStatus(status);
      }
    } catch (error) {
      console.error('Failed to check voice status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const generateVoice = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const requestBody = {
        maxDurationMinutes: maxDuration[0],
        voiceStyle,
        regenerate: forceRegenerate,
      };

      console.log('🎙️ Starting voice generation with:', requestBody);

      const response = await fetch(`/api/dashboards/${dashboardId}/generate-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: VoiceGenerationResult = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Voice generation failed with status ${response.status}`);
      }

      setResult(data);
      
      // Update voice status
      await checkVoiceStatus();

      // Notify parent component
      if (data.success && data.audioUrl && data.transcript && onAudioGenerated) {
        onAudioGenerated(data.audioUrl, data.transcript);
      }

      // Show success toast
      if (data.cached) {
        toast({
          title: "Voice Summary Ready",
          description: "Using existing voice summary. Click regenerate to create a new one.",
        });
      } else {
        toast({
          title: "Voice Summary Generated!",
          description: `Created ${data.analysis?.estimatedDuration}s summary with ${data.analysis?.wordCount} words.`,
        });
      }

    } catch (error) {
      console.error('Voice generation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({
        success: false,
        error: errorMessage,
      });

      toast({
        title: "Voice Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={className}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Generate Voice Summary
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Summary Generation
          </DialogTitle>
          <DialogDescription>
            Generate an AI-powered voice summary of your dashboard insights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Status Section */}
          {isCheckingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking existing voice summary...
            </div>
          ) : voiceStatus?.hasAudio && !forceRegenerate ? (
            <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Voice Summary Exists</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-300 mb-3">
                Last generated: {voiceStatus.lastGenerated ? formatDate(voiceStatus.lastGenerated) : 'Unknown'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForceRegenerate(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
                {voiceStatus.audioUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (voiceStatus.audioUrl && voiceStatus.transcript && onAudioGenerated) {
                        onAudioGenerated(voiceStatus.audioUrl, voiceStatus.transcript);
                      }
                      setIsOpen(false);
                    }}
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Use Existing
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {/* Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h3 className="font-medium">Generation Settings</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voice-style">Voice Style</Label>
                <Select value={voiceStyle} onValueChange={(value: any) => setVoiceStyle(value)}>
                  <SelectTrigger id="voice-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Max Duration: {maxDuration[0]} minutes</Label>
                <Slider
                  id="duration"
                  min={1}
                  max={10}
                  step={1}
                  value={maxDuration}
                  onValueChange={setMaxDuration}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="regenerate"
                checked={forceRegenerate}
                onCheckedChange={setForceRegenerate}
              />
              <Label htmlFor="regenerate" className="text-sm">
                Force regeneration (ignore existing audio)
              </Label>
            </div>
          </div>

          {/* Generation Result */}
          {result && (
            <div className="space-y-4">
              {result.success ? (
                <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      {result.cached ? 'Using Existing Summary' : 'Generation Successful!'}
                    </span>
                  </div>
                  
                  {result.analysis && (
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Widgets Analyzed:</span>
                        <span className="ml-2 font-medium">{result.analysis.totalWidgets}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="ml-2 font-medium">~{formatDuration(result.analysis.estimatedDuration)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Word Count:</span>
                        <span className="ml-2 font-medium">{result.analysis.wordCount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Voice Style:</span>
                        <span className="ml-2 font-medium capitalize">{result.voice?.style}</span>
                      </div>
                    </div>
                  )}

                  {result.analysis?.themes && result.analysis.themes.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm text-muted-foreground mb-2 block">Key Themes:</span>
                      <div className="flex flex-wrap gap-1">
                        {result.analysis.themes.map((theme, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.keyHighlights && result.keyHighlights.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Key Highlights:</span>
                      <ScrollArea className="max-h-32">
                        <ul className="text-sm space-y-1">
                          {result.keyHighlights.map((highlight, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border bg-red-50 dark:bg-red-900/10 p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Generation Failed</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {result.error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={generateVoice} 
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Generate Voice
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}