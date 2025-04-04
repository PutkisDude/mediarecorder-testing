import { ref } from "vue";

export default function useAudioRecorder(transcribeAudio) {
    const isRecording = ref(false);
    const audioFiles = ref([]);
    const audioDuration = ref(0);
    let mediaRecorder = null;
    let startTime = 0;
    let stream = null;
    let analyser = null;
    let audioContext = null;
    let silenceTimer = null;

    async function startRecording() {
        if (isRecording.value) return;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            isRecording.value = true;
            setupSilenceDetection(stream);
            startNewRecording();
        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    }

    function setupSilenceDetection(stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        const checkSilence = () => {
            analyser.getByteTimeDomainData(dataArray);
            const isSilent = dataArray.every(val => Math.abs(val - 128) < 5); // Adjust threshold if needed

            if (isSilent) {
                if (!silenceTimer) {
                    silenceTimer = setTimeout(() => {
                        if (mediaRecorder && isRecording.value) {
                            mediaRecorder.stop();
                        }
                    }, 2000); // 2 seconds of silence
                }
            } else {
                if (silenceTimer) {
                    clearTimeout(silenceTimer);
                    silenceTimer = null;
                }
            }

            if (isRecording.value) {
                requestAnimationFrame(checkSilence);
            }
        };

        checkSilence();
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
            if (silenceTimer) clearTimeout(silenceTimer);
            if (audioContext) audioContext.close();
        }
    }

    return {
        startRecording,
        stopRecording,
        isRecording,
        audioFiles,
        audioDuration,
    };
}
