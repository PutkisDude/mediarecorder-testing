import { ref, onBeforeUnmount } from "vue";

export default function useAudioRecorder(transcribeAudio) {
    const isRecording = ref(false);
    const audioFiles = ref([]);
    const audioDuration = ref(0);
    const error = ref(null); // To track errors
    let mediaRecorder = null;
    let startTime = 0;
    let stream = null;
    let analyser = null;
    let audioContext = null;
    let silenceTimer = null;

    async function startRecording() {
        if (isRecording.value) return;
        error.value = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    noiseSuppression: true,
                    echoCancellation: true,
                },
            });
            isRecording.value = true;
            setupSilenceDetection(stream);
            startNewRecording();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            error.value = err;
            stopStream(); // Ensure stream is stopped on error
        }
    }

    function setupSilenceDetection(stream) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);

            const bufferLength = analyser.fftSize;
            const dataArray = new Uint8Array(bufferLength);

            const checkSilence = () => {
                if (!isRecording.value) return; // Stop checking if not recording

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

                requestAnimationFrame(checkSilence);
            };

            checkSilence();
        } catch (err) {
            console.error("Error setting up silence detection:", err);
            error.value = err;
            stopStream(); // Ensure stream is stopped on error
        }
    }

    function startNewRecording() {
        if (!stream) return; // Ensure stream exists

        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/mp4" });
        let audioChunks = [];
        startTime = performance.now();

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const newBlob = new Blob(audioChunks, { type: "audio/mp4" });
                audioFiles.value.push(newBlob);
                audioDuration.value += (performance.now() - startTime) / 1000;

                await transcribeAudio(newBlob);
            }

            if (isRecording.value) {
                startNewRecording(); // Start a new recording chunk
            }
        };

        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event);
            error.value = new Error("MediaRecorder error");
            stopRecording();
        };

        mediaRecorder.start();
    }

    function stopRecording() {
        if (isRecording.value) {
            isRecording.value = false;
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            if (silenceTimer) clearTimeout(silenceTimer);
            stopStream();
            if (audioContext) {
                try {
                    audioContext.close();
                    audioContext = null;
                } catch (err) {
                    console.error("Error closing AudioContext:", err);
                }
            }
        }
    }

    function stopStream() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    function clearRecordings() {
        audioFiles.value = [];
        audioDuration.value = 0;
    }

    onBeforeUnmount(() => {
        stopRecording(); // Ensure resources are cleaned up on unmount
    });

    return {
        startRecording,
        stopRecording,
        isRecording,
        audioFiles,
        audioDuration,
        error, 
        clearRecordings,
    };
}