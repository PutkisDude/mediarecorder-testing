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
          <button @click="playAudio(file)">Play File {{ index + 1 }}</button>
        </li>
      </ul>

      <button @click="playAllAudio">Play All Files</button>
    </div>

    <audio v-if="currentAudio" ref="audioPlayer" controls></audio>

    <p v-if="audioDuration">Audio Duration: {{ audioDuration.toFixed(2) }} seconds</p>
    <p v-if="transcription">Transcription: {{ transcription }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import useWhisperTranscription from "./whisper.js";
import useAudioRecorder from "./recorder.js";

const { transcribeAudio, transcription } = useWhisperTranscription();
const { startRecording, stopRecording, isRecording, audioFiles, audioDuration, clearRecordingInterval } = useAudioRecorder(transcribeAudio);
const audioPlayer = ref(null);
const currentAudio = ref(null);

async function handleStopRecording() {
  stopRecording();
  clearRecordingInterval();
}

// Play a specific audio file from the recorded files
function playAudio(file) {
  if (file) {
      const audioURL = URL.createObjectURL(file);
      currentAudio.value = audioURL;
      audioPlayer.value.src = audioURL;
      audioPlayer.value.play();
  }
}

// Play all the audio files sequentially
function playAllAudio() {
  if (audioFiles.value.length === 0) return;

  let currentIndex = 0;
  const playNext = () => {
      if (currentIndex < audioFiles.value.length) {
          const file = audioFiles.value[currentIndex];
          playAudio(file);
          currentIndex++;
      }
  };

  audioPlayer.value.onended = playNext;
  playNext();
}
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
