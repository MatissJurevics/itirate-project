# 11Labs Voice Integration

This document describes the voice generation system that creates AI-powered audio summaries of dashboard data.

## Overview

The voice integration system analyzes dashboard widgets, generates narrative summaries using AI, and converts them to high-quality speech using 11Labs text-to-speech API.

## Features

- **Smart Dashboard Analysis**: Automatically extracts insights from all dashboard widgets
- **AI-Powered Summaries**: Uses Claude AI to generate natural, engaging narratives
- **High-Quality Voice**: 11Labs TTS with customizable voice styles and settings
- **Persistent Audio**: Generated audio is saved and cached for future use
- **Multiple Voice Styles**: Professional, conversational, and analytical tones
- **Configurable Duration**: Control audio length from 1-10 minutes

## Setup

### 1. Environment Configuration

Add your 11Labs API key to your environment variables:

```bash
# Required
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional voice settings
ELEVENLABS_DEFAULT_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_DEFAULT_MODEL_ID=eleven_multilingual_v2
```

### 2. 11Labs Account Setup

1. Sign up for an 11Labs account at https://elevenlabs.io
2. Get your API key from the profile settings
3. Ensure you have sufficient quota for voice generation

### 3. Audio Storage

The system automatically creates a `/public/audio` directory for storing generated audio files. Ensure your deployment environment has write permissions.

## Usage

### Frontend Integration

The voice generation feature is integrated into the dashboard page header:

```tsx
<VoiceGenerationButton 
  dashboardId={dashboardId}
  onAudioGenerated={(audioUrl, transcript) => {
    // Handle new audio
  }}
/>
```

### API Usage

Generate voice summary programmatically:

```bash
# Generate new voice summary
POST /api/dashboards/{dashboardId}/generate-voice
{
  "maxDurationMinutes": 3,
  "voiceStyle": "professional",
  "regenerate": false
}

# Check voice status
GET /api/dashboards/{dashboardId}/generate-voice
```

## System Architecture

### 1. Dashboard Analysis (`DashboardAnalyzer`)
- Extracts data insights from all widget types
- Calculates statistics and trends
- Identifies key themes and patterns

### 2. AI Summary Generation (`generateVoiceSummary`)
- Uses Claude AI to create narrative summaries
- Optimizes text for voice narration
- Generates scripts with natural speech patterns

### 3. Voice Service (`VoiceService`)
- Handles 11Labs API integration
- Manages audio file storage
- Provides voice quality settings

### 4. API Endpoint (`/generate-voice/route.ts`)
- Orchestrates the complete pipeline
- Handles caching and regeneration
- Updates dashboard with audio URLs

## Voice Settings

### Recommended Voice IDs
- **Dashboard Narration**: `JBFqnCBsd6RMkjVDRZzb` (George - clear, professional)
- **Conversational**: `EXAVITQu4vr4xnSDxMaL` (Bella - warm, engaging)
- **Technical**: `ErXwobaYiN019PkySvjV` (Antoni - authoritative)

### Voice Parameters
- **Stability**: 0.75 (controls voice consistency)
- **Similarity Boost**: 0.75 (enhances voice clarity)
- **Style**: 0.0-1.0 (adjusts expressiveness)
- **Speaker Boost**: true (improves quality)

## Error Handling

The system handles various error conditions:

- **API Quota Exceeded**: Returns 429 status with quota message
- **Authentication Issues**: Returns 401 with API key error
- **Rate Limiting**: Returns 429 with retry message
- **No Widgets**: Returns 400 if dashboard is empty
- **File System Errors**: Graceful fallback with error logging

## Performance Considerations

### Audio Generation Times
- **Short Summary (1-2 min)**: ~5-15 seconds
- **Medium Summary (3-5 min)**: ~15-30 seconds
- **Long Summary (5+ min)**: ~30-60 seconds

### File Sizes
- **MP3 Quality**: ~1-2 MB per minute of audio
- **Storage**: Files are stored in `/public/audio/`
- **Caching**: Audio URLs are saved in dashboard records

### API Usage
- **Text Limits**: 11Labs supports up to 5000 characters per request
- **Rate Limits**: Varies by subscription tier
- **Quota**: Check your 11Labs dashboard for usage limits

## Customization

### Adding New Voice Styles

Extend the voice style options in `VoiceGenerationButton`:

```tsx
const voiceStyles = [
  { value: 'professional', label: 'Professional', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
  { value: 'conversational', label: 'Conversational', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  { value: 'technical', label: 'Technical', voiceId: 'ErXwobaYiN019PkySvjV' },
  { value: 'custom', label: 'Custom', voiceId: 'your_voice_id' }
];
```

### Custom Analysis Logic

Extend `DashboardAnalyzer` for specific widget types:

```typescript
private static analyzeCustomWidget(widget: Widget): WidgetInsight | null {
  // Add custom analysis logic
  return {
    id: widget.id,
    title: widget.title || 'Custom Widget',
    type: 'custom',
    insights: ['Custom insight'],
    keyMetrics: ['Custom metric'],
    dataContext: 'Custom context'
  };
}
```

## Troubleshooting

### Common Issues

1. **"API key required" Error**
   - Ensure `ELEVENLABS_API_KEY` is set in environment variables
   - Verify the API key is valid and active

2. **"Quota exceeded" Error**
   - Check your 11Labs subscription usage
   - Upgrade plan or wait for quota reset

3. **Audio Not Playing**
   - Verify `/public/audio/` directory exists and is writable
   - Check browser console for audio loading errors
   - Ensure audio URL is accessible

4. **Generation Timeout**
   - Reduce `maxDurationMinutes` for faster generation
   - Check network connectivity to 11Labs API
   - Verify dashboard has analyzable widgets

### Debugging

Enable detailed logging by adding to your environment:

```bash
DEBUG=voice:*
```

This will log detailed information about:
- Dashboard analysis results
- AI summary generation
- Voice API calls
- Audio file operations

## Future Enhancements

Potential improvements for the voice system:

1. **Voice Cloning**: Support custom voice cloning
2. **Multiple Languages**: Add multi-language support
3. **SSML Support**: Advanced speech markup for better control
4. **Streaming Audio**: Real-time audio generation and playback
5. **Voice Analytics**: Track listening metrics and engagement
6. **Custom Voices**: Organization-specific voice training
7. **Audio Processing**: Post-processing effects and optimization