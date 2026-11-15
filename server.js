const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware for parsing JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Basic health check endpoint (useful for Google Cloud Run container checks)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CareCircle',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/send-email
 * 
 * Sends an email notification using Nodemailer with Gmail SMTP.
 * Secrets (EMAIL_USER, EMAIL_PASS) are read strictly from process.env.
 * If credentials are missing, returns { preview: true, ... } so the client can display an email preview.
 */
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    // Validate payload
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        error: 'Missing required fields: "to", "subject", and at least one of "text" or "html" must be provided.'
      });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    // If secrets are missing, return preview mode response
    if (!emailUser || !emailPass) {
      return res.status(200).json({
        preview: true,
        message: 'EMAIL_USER or EMAIL_PASS environment variables are not configured. Returning email preview.',
        email: {
          to,
          subject,
          text: text || null,
          html: html || null,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Configure Nodemailer Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"CareCircle Alerts" <${emailUser}>`,
      to,
      subject,
      text,
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      preview: false,
      success: true,
      messageId: info.messageId,
      message: 'Email dispatched successfully.'
    });
  } catch (error) {
    console.error('Error in POST /api/send-email:', error);
    return res.status(500).json({
      error: 'Failed to send email.',
      details: error.message
    });
  }
});

/**
 * In-memory cache for Google Cloud TTS responses
 * Key: `${lang}:${text}` -> base64 audio
 */
const ttsCache = new Map();
let ttsClient = null;

try {
  const textToSpeech = require('@google-cloud/text-to-speech');
  ttsClient = new textToSpeech.TextToSpeechClient();
} catch (err) {
  console.warn('[CareCircle TTS] @google-cloud/text-to-speech not loaded in local environment:', err.message);
}

/**
 * POST /api/tts
 * 
 * Synthesizes natural speech using Google Cloud Text-to-Speech (mr-IN, hi-IN, en-IN).
 * Prefers Neural2 or Wavenet voices when available.
 * Caches results in memory by text+lang and returns MP3 audio as base64.
 */
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang = 'mr-IN' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing required field: "text" must be a non-empty string.'
      });
    }

    const trimmedText = text.trim();
    const cacheKey = `${lang}:${trimmedText}`;

    // Return from in-memory cache if previously synthesized
    if (ttsCache.has(cacheKey)) {
      return res.status(200).json({
        audioContent: ttsCache.get(cacheKey),
        cached: true,
        voicePath: 'gcp-cache'
      });
    }

    if (!ttsClient) {
      return res.status(503).json({
        fallback: true,
        message: '@google-cloud/text-to-speech client not initialized or credentials missing.'
      });
    }

    // Determine voice selection for requested language
    const voiceRequest = {
      languageCode: lang,
      ssmlGender: 'NEUTRAL'
    };

    try {
      const [voicesList] = await ttsClient.listVoices({ languageCode: lang });
      const voices = voicesList.voices || [];
      const preferredVoice = voices.find(v => v.name.includes('Neural2')) ||
                             voices.find(v => v.name.includes('Wavenet')) ||
                             voices.find(v => v.name.includes('Standard')) ||
                             voices[0];
      if (preferredVoice) {
        voiceRequest.name = preferredVoice.name;
        voiceRequest.ssmlGender = preferredVoice.ssmlGender;
      }
    } catch (vErr) {
      console.warn('[CareCircle TTS] listVoices query failed, falling back to default voice config:', vErr.message);
    }

    const request = {
      input: { text: trimmedText },
      voice: voiceRequest,
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.88, // calm, clear pace for elderly comprehension
        pitch: 0.0
      }
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioBase64 = response.audioContent.toString('base64');

    // Save in memory cache
    ttsCache.set(cacheKey, audioBase64);

    return res.status(200).json({
      audioContent: audioBase64,
      cached: false,
      voicePath: 'gcp-tts'
    });
  } catch (error) {
    console.warn('[CareCircle TTS] Synthesis error:', error.message);
    return res.status(500).json({
      fallback: true,
      error: error.message
    });
  }
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`CareCircle server listening on port ${PORT}`);
});
