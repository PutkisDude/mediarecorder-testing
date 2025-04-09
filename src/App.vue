<template>
  <div class="app">
    <button @click="startRecording" :class="{ recording: isRecording }">
      {{ isRecording ? "Listening..." : "Start Recording" }}
    </button>
    <button @click="handleStopRecording" :disabled="!isRecording">Stop Recording</button>

    <div v-if="audioFiles.length > 0">
      <h3>Recorded Audio Files:</h3>
      <ul>
        <li v-for="(file, index) in audioFiles" :key="index">
          <button @click="playSingleAudio(file, index)">Play File {{ index + 1 }}</button>
        </li>
      </ul>

      <button @click="playAllAudio" :disabled="audioFiles.length === 0">Play All Files</button>
    </div>

    <audio v-if="currentAudioURL" ref="audioPlayer" controls @error="handlePlaybackError"></audio>

    <p v-if="audioDuration">Audio Duration: {{ audioDuration.toFixed(2) }} seconds</p>
    <p v-if="transcription">Transcription: {{ transcription }}</p>
    <p v-if="whisperError" style="color: red;">Whisper Error: {{ whisperError }}</p>
    <p v-if="playbackError" style="color: red;">Playback Error: {{ playbackError }}</p>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import useWhisperTranscription from "./whisper.js";
import useAudioRecorder from "./recorder.js";

const { transcribeAudio, transcription, whisperError } = useWhisperTranscription();
const { startRecording, stopRecording, isRecording, audioFiles, audioDuration, clearSilenceTimer, error: recorderError } = useAudioRecorder(transcribeAudio);
const audioPlayer = ref(null);
const currentAudioURL = ref(null);
const playbackError = ref(null);
let objectURLs = []; // To store created object URLs

async function handleStopRecording() {
  stopRecording();
  if (clearSilenceTimer) {
    clearSilenceTimer();
  }
}

function revokeObjectUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
    objectURLs = objectURLs.filter(u => u !== url);
  }
}

// Play a specific audio file from the recorded files
function playSingleAudio(file, index) {
  playbackError.value = null;
  if (currentAudioURL.value) {
    revokeObjectUrl(currentAudioURL.value);
    if (audioPlayer.value) {
      audioPlayer.value.onended = null; // Reset playAll listener
    }
  }
  if (file) {
    const audioURL = URL.createObjectURL(file);
    currentAudioURL.value = audioURL;
    objectURLs.push(audioURL);
    if (audioPlayer.value) {
      audioPlayer.value.src = audioURL;
      audioPlayer.value.play();
    }
  }
}

// Play all the audio files sequentially
function playAllAudio() {
  playbackError.value = null;
  if (audioFiles.value.length === 0 || !audioPlayer.value) return;

  let currentIndex = 0;

  const playNext = () => {
    if (currentIndex < audioFiles.value.length) {
      const file = audioFiles.value[currentIndex];
      const audioURL = URL.createObjectURL(file);
      revokeObjectUrl(currentAudioURL.value); // Revoke previous URL
      currentAudioURL.value = audioURL;
      objectURLs.push(audioURL);
      audioPlayer.value.src = audioURL;
      audioPlayer.value.onended = () => {
        currentIndex++;
        playNext();
      };
      audioPlayer.value.play();
    } else {
      // All files played, reset onended listener
      audioPlayer.value.onended = null;
      currentAudioURL.value = null;
    }
  };

  playNext();
}

function handlePlaybackError(event) {
  console.error("Audio playback error:", event);
  playbackError.value = "An error occurred during audio playback.";
}

onUnmounted(() => {
  // Revoke all object URLs on component unmount
  objectURLs.forEach(url => URL.revokeObjectURL(url));
  objectURLs = [];
});
</script>

<style>
.app {
  text-align: center;
  margin-top: 50px;
}
button {
  padding: 10px 20px;
  margin: 5px;
  font-size: 16px;
  cursor: pointer;
}
.recording {
  background-color: red;
  color: white;
}
</style>