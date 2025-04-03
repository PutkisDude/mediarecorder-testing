import { ref } from "vue";

export default function useWhisperTranscription() {
    const transcription = ref("");
    const key = import.meta.env.VITE_OPENAI_API_KEY;

    async function transcribeAudio(audioBlob) {
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("model", "whisper-1");
        formData.append("language", "en"); 
        formData.append("task", "transcribe");

        try {
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`
                },
                body: formData
            });

            const result = await response.json();

            if (result && result.text) {
                const transcriptText = result.text.trim();

                if (transcriptText.toLowerCase() === "thank you." || transcriptText.toLowerCase() === "bye." || transcriptText === "") {
                    console.warn("Ignoring Whisper response: 'Thank you'");
                    return;
                }

                transcription.value += " " + transcriptText;
            }                
        } catch (error) {
            console.error("Error sending audio to Whisper:", error);
        }
    }

    return {
        transcribeAudio,
        transcription,
    };
}
