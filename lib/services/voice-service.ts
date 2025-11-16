import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface VoiceSettings {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface VoiceGenerationResult {
  audioBuffer: Buffer;
  filePath: string;
  publicUrl: string;
  duration: number; // estimated duration in seconds
  voiceId: string;
  modelId: string;
}

export class VoiceService {
  private static client: ElevenLabsClient | null = null;
  private static readonly DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George voice - good for narration
  private static readonly DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

  private static getClient(): ElevenLabsClient {
    if (!this.client) {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY environment variable is required');
      }

      this.client = new ElevenLabsClient({ apiKey });
    }

    return this.client;
  }

  /**
   * Convert text to speech using 11Labs API
   */
  static async generateSpeech(
    text: string, 
    options: VoiceSettings = {}
  ): Promise<VoiceGenerationResult> {
    try {
      console.log('🎙️ Starting voice generation...');
      console.log(`📝 Text length: ${text.length} characters`);

      const client = this.getClient();
      
      const voiceId = options.voiceId || this.DEFAULT_VOICE_ID;
      const modelId = options.modelId || this.DEFAULT_MODEL_ID;

      console.log(`🎤 Using voice: ${voiceId}`);
      console.log(`🤖 Using model: ${modelId}`);

      // Generate speech
      const audio = await client.textToSpeech.convert(voiceId, {
        text,
        modelId,
        voice_settings: {
          stability: options.stability ?? 0.75,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0.0,
          use_speaker_boost: options.useSpeakerBoost ?? true,
        },
      });

      console.log('✅ Audio generated successfully');

      // Convert ReadableStream to Buffer
      const audioBuffer = await this.streamToBuffer(audio);
      console.log(`📦 Audio buffer size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

      // Save to file system
      const { filePath, publicUrl } = await this.saveAudioFile(audioBuffer);

      // Estimate duration (rough calculation: 1 second per 2-3 characters for clear speech)
      const estimatedDuration = Math.ceil(text.length / 2.5);

      console.log(`⏱️ Estimated duration: ${estimatedDuration} seconds`);
      console.log(`💾 Saved to: ${filePath}`);
      console.log(`🌐 Public URL: ${publicUrl}`);

      return {
        audioBuffer,
        filePath,
        publicUrl,
        duration: estimatedDuration,
        voiceId,
        modelId,
      };

    } catch (error) {
      console.error('Voice generation error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new Error('11Labs API quota exceeded. Please check your subscription.');
        } else if (error.message.includes('authentication') || error.message.includes('API key')) {
          throw new Error('11Labs API authentication failed. Please check your API key.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('11Labs API rate limit exceeded. Please try again later.');
        }
      }
      
      throw new Error(`Voice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert ReadableStream to Buffer
   */
  private static async streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }

  /**
   * Save audio file to public directory
   */
  private static async saveAudioFile(audioBuffer: Buffer): Promise<{ filePath: string; publicUrl: string }> {
    const timestamp = Date.now();
    const fileName = `voice-summary-${timestamp}.mp3`;
    const audioDir = join(process.cwd(), 'public', 'audio');
    const filePath = join(audioDir, fileName);

    // Ensure audio directory exists
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true });
    }

    // Write audio file
    await writeFile(filePath, audioBuffer);

    // Return paths
    const publicUrl = `/audio/${fileName}`;

    return {
      filePath,
      publicUrl,
    };
  }

  /**
   * Get list of available voices from 11Labs
   */
  static async getAvailableVoices(): Promise<any[]> {
    try {
      const client = this.getClient();
      const voices = await client.voices.getAll();
      
      console.log(`📋 Found ${voices.voices?.length || 0} available voices`);
      
      return voices.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  /**
   * Get recommended voice settings for different content types
   */
  static getVoiceSettings(contentType: 'dashboard' | 'narrative' | 'technical'): VoiceSettings {
    switch (contentType) {
      case 'dashboard':
        return {
          voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George - clear and professional
          modelId: 'eleven_multilingual_v2',
          stability: 0.8,
          similarityBoost: 0.75,
          style: 0.2,
          useSpeakerBoost: true,
        };
      case 'narrative':
        return {
          voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm and engaging
          modelId: 'eleven_multilingual_v2',
          stability: 0.7,
          similarityBoost: 0.8,
          style: 0.4,
          useSpeakerBoost: true,
        };
      case 'technical':
        return {
          voiceId: 'ErXwobaYiN019PkySvjV', // Antoni - clear and authoritative
          modelId: 'eleven_multilingual_v2',
          stability: 0.85,
          similarityBoost: 0.7,
          style: 0.1,
          useSpeakerBoost: true,
        };
      default:
        return {
          voiceId: this.DEFAULT_VOICE_ID,
          modelId: this.DEFAULT_MODEL_ID,
          stability: 0.75,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
        };
    }
  }

  /**
   * Test voice generation with a short sample
   */
  static async testVoiceGeneration(): Promise<boolean> {
    try {
      const testText = 'This is a test of the voice generation system. The audio quality should be clear and natural.';
      const result = await this.generateSpeech(testText);
      
      console.log('✅ Voice generation test successful');
      console.log(`🎵 Generated ${result.audioBuffer.length} bytes of audio`);
      
      return true;
    } catch (error) {
      console.error('❌ Voice generation test failed:', error);
      return false;
    }
  }
}