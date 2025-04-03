import { ref } from "vue";

export default function useAudioRecorder(transcribeAudio) {
    const isRecording = ref(false);
    const audioFiles = ref([]);
    const audioDuration = ref(0);
    let mediaRecorder = null;
    let startTime = 0;
    let intervalId = null;
    let stream = null;

    async function startRecording() {
        if (isRecording.value) return;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            isRecording.value = true;
            startNewRecording();

            // Start a new recording chunk every 5 seconds
            intervalId = setInterval(() => {
                if (isRecording.value) {
                    mediaRecorder.stop(); // Stop the current chunk
                }
            }, 5000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    }

    function startNewRecording() {
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        let audioChunks = [];
        startTime = performance.now();

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const newBlob = new Blob(audioChunks, { type: "audio/webm" });
                audioFiles.value.push(newBlob);
                audioDuration.value += (performance.now() - startTime) / 1000;

                // Send audio chunk to Whisper immediately
                await transcribeAudio(newBlob);
            }

            if (isRecording.value) {
                startNewRecording(); // Start a new recording chunk
            }
        };

        mediaRecorder.start();
    }

    function stopRecording() {
        if (mediaRecorder && isRecording.value) {
            isRecording.value = false;
            mediaRecorder.stop();
            clearRecordingInterval();
        }
    }

    function clearRecordingInterval() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return {
        startRecording,
        stopRecording,
        isRecording,
        audioFiles,
        audioDuration,
        clearRecordingInterval,
    };
}
