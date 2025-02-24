# Audio Samples Directory

This directory contains audio samples for use with the Code of Music drum machine.

## Sample Format

- Audio files should be in WAV or MP3 format
- Sample names should match the filename (without extension)
- Samples should be relatively short (under 2 seconds) for best performance

## Default Samples

The system looks for the following default samples:

- `kick.wav` - Kick drum
- `snare.wav` - Snare drum
- `hihat.wav` - Hi-hat
- `clap.wav` - Hand clap
- `tom.wav` - Tom drum
- `rim.wav` - Rim shot
- `cowbell.wav` - Cowbell

## Adding Custom Samples

To add your own samples:

1. Place the audio file in this directory
2. Use the filename (without extension) as the sound name in your code

Example:
```
// If you add a file named "my-cool-sound.wav"
(track "my-cool-sound" 
  (step 1)
  (step 0)
  (step 1)
  (step 0))
```

## Fallback Behavior

If a sample cannot be found, the system will use a synthesized sound as a fallback. 