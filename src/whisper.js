import { ref } from "vue";

export default function useWhisperTranscription() {
    const transcription = ref("");
    const whisperError = ref(null); // Ref to hold Whisper errors
    const key = import.meta.env.VITE_OPENAI_API_KEY;

    async function transcribeAudio(audioBlob) {
        whisperError.value = null; // Reset error on new transcription attempt
        const formData = new FormData();

        // Use the actual audio blob type to determine the filename extension
        let filename = "recording";
        if (audioBlob.type === "audio/webm") {
            filename += ".webm";
        } else if (audioBlob.type === "audio/mp4") {
            filename += ".mp4";
        } else if (audioBlob.type === "audio/mpeg") {
            filename += ".mp3";
        } else if (audioBlob.type === "audio/wav") {
            filename += ".wav";
        } else if (audioBlob.type === "audio/x-m4a") {
            filename += ".m4a";
        } else {
            filename += ".unknown";
            console.warn(`Unknown audio blob type: ${audioBlob.type}. Using generic filename.`);
        }

        console.log(filename);

        formData.append("file", audioBlob, filename);
        formData.append("model", "whisper-1");
        formData.append("language", "en");
        formData.append("task", "transcribe");

        try {
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Whisper API error:", errorData);
                whisperError.value = errorData.error?.message || `HTTP error! status: ${response.status}`;
                return;
            }

            const result = await response.json();

            if (result && result.text) {
                const transcriptText = result.text.trim();

                if (transcriptText.toLowerCase() === "thank you." || transcriptText.toLowerCase() === "bye." || transcriptText === "") {
                    console.warn("Ignoring Whisper response: 'Thank you' or similar");
                    return;
                }

                transcription.value += " " + transcriptText;
            }
        } catch (error) {
            console.error("Error sending audio to Whisper:", error);
            whisperError.value = "Failed to send audio to Whisper.";
        }
    }

    return {
        transcribeAudio,
        transcription,
        whisperError, // Expose the error ref
    };
}