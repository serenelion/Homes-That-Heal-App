export const SpeechOut = {
  speak: (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel existing speech to ensure urgent instructions cut through
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.05; // Slightly faster for flow
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  },

  stop: () => {
    window.speechSynthesis.cancel();
  }
};
