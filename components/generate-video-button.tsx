"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Play,
  X,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PresentationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage?: string;
  error_message?: string;
  video_url?: string;
  video_duration?: number;
  slide_count?: number;
}

interface ExistingVideo {
  exists: boolean;
  jobId?: string;
  videoUrl?: string;
  videoDuration?: number;
  slideCount?: number;
  completedAt?: string;
}

interface GenerateVideoButtonProps {
  dashboardId: string;
}

export function GenerateVideoButton({ dashboardId }: GenerateVideoButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const { toast } = useToast();

  // Check for existing video on mount
  useEffect(() => {
    const checkExistingVideo = async () => {
      try {
        const res = await fetch(`/api/presentation/existing/${dashboardId}`);
        if (res.ok) {
          const data: ExistingVideo = await res.json();
          if (data.exists && data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setVideoDuration(data.videoDuration || null);
            setSlideCount(data.slideCount || null);
            setStatus('completed');
            setJobId(data.jobId || null);
          }
        }
      } catch (error) {
        console.error('Error checking for existing video:', error);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingVideo();
  }, [dashboardId]);

  // Poll for status updates
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/presentation/status/${jobId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch status');
        }
        
        const job: PresentationJob = await res.json();
        
        setStatus(job.status);
        setProgress(job.progress || 0);
        setCurrentStage(job.current_stage || '');
        
        if (job.status === 'completed' && job.video_url) {
          setVideoUrl(job.video_url);
          setVideoDuration(job.video_duration || null);
          setSlideCount(job.slide_count || null);
          setShowPreview(true);
          toast({
            title: 'Video ready!',
            description: `Your presentation video has been generated with ${job.slide_count || 0} slides.`,
          });
        } else if (job.status === 'failed') {
          toast({
            title: 'Generation failed',
            description: job.error_message || 'Unknown error occurred',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, status, toast]);

  const handleGenerate = async () => {
    try {
      setStatus('pending');
      setProgress(0);
      setCurrentStage('');
      setVideoUrl(null);
      setShowPreview(false);
      
      const res = await fetch('/api/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }
      
      setJobId(data.jobId);
      setStatus('processing');
      
      toast({
        title: 'Generation started',
        description: 'Your video is being generated. This may take a few minutes.',
      });
    } catch (error) {
      setStatus('failed');
      toast({
        title: 'Failed to start generation',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'presentation.mp4';
      a.click();
    }
  };

  const handleRegenerate = async () => {
    setShowPreview(false);
    await handleGenerate();
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStage = (stage: string): string => {
    return stage
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Of/g, 'of');
  };

  // Show loading state while checking for existing video
  if (checkingExisting) {
    return (
      <Button disabled className="flex items-center gap-2" variant="secondary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking...</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'idle' && (
        <Button 
          onClick={handleGenerate} 
          className="flex items-center gap-2"
          size="default"
        >
          <Video className="w-4 h-4" />
          Generate Video
        </Button>
      )}
      
      {(status === 'pending' || status === 'processing') && (
        <Popover open={true}>
          <PopoverTrigger asChild>
            <Button 
              disabled 
              className="flex items-center gap-2 min-w-[180px]"
              variant="secondary"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium">{progress}%</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generating Video</span>
                <Badge variant="secondary" className="text-xs">
                  {progress}%
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
              {currentStage && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{formatStage(currentStage)}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                This may take a few minutes depending on the number of charts.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {status === 'completed' && videoUrl && (
        <Popover open={showPreview} onOpenChange={setShowPreview}>
          <PopoverTrigger asChild>
            <Button 
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => setShowPreview(true)}
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-medium">Video Ready</span>
              {videoDuration && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {formatDuration(videoDuration)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Video Generated</span>
                    <span className="text-xs text-muted-foreground">
                      {slideCount ? `${slideCount} slide${slideCount !== 1 ? 's' : ''}` : 'Ready to download'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg border"
                  style={{ maxHeight: '300px' }}
                />
              </div>
              <div className="flex gap-2 p-4 border-t">
                <Button 
                  onClick={handleDownload} 
                  className="flex-1 flex items-center justify-center gap-2"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(videoUrl, '_blank');
                  }}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Play className="w-4 h-4" />
                  Open
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  className="flex items-center gap-2"
                  size="sm"
                  title="Regenerate video"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {status === 'failed' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="destructive"
              className="flex items-center gap-2"
              onClick={handleGenerate}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Retry</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium">Generation Failed</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Click retry to try again, or check the error logs for more details.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
