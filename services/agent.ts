import { AgentResponse, ScanState, ScanPhase } from "../types";
import { MIN_PHOTOS_PER_CORNER, TARGET_PHOTOS_PER_CORNER_MIN, MAX_PHOTOS_TOTAL } from "../constants";

// This simulates the LLM decision making process locally for the prototype
export const AgentAPI = {
  send: async (state: ScanState): Promise<AgentResponse> => {
    const { currentPhase, photos, lastAction } = state;
    const phasePhotos = photos.filter(p => p.phase === currentPhase);
    const count = phasePhotos.length;
    const total = photos.length;

    // Default response
    let response: AgentResponse = {
      assistantText: "",
      warnings: [],
      shouldSpeak: false,
    };

    // Hard stop check
    if (total >= MAX_PHOTOS_TOTAL) {
      return {
        assistantText: "Maximum photo limit reached. Please proceed to review.",
        warnings: ["Max limit reached (300)"],
        shouldSpeak: true
      };
    }

    if (lastAction === 'PHASE_CHANGED') {
      response.shouldSpeak = true;
      switch (currentPhase) {
        case 'CORNER_1':
          response.assistantText = "Let's start. Stand in the first corner. Take overlapping photos while rotating slowly.";
          break;
        case 'CORNER_2':
          response.assistantText = "Move to the second corner. Remember to hold still before capturing.";
          break;
        case 'CORNER_3':
          response.assistantText = "Third corner. Keep your height consistent.";
          break;
        case 'CORNER_4':
          response.assistantText = "Final corner. Rotate about 20 degrees between shots.";
          break;
        case 'PERIMETER':
          response.assistantText = "Now, walk along the walls. Face the center of the room and side-step.";
          break;
        case 'REVIEW':
          response.assistantText = "Scan complete. Review your coverage before generating the model.";
          break;
      }
      return response;
    }

    // Feedback during shooting
    if (lastAction === 'PHOTO_TAKEN') {
      // Determine if we should speak based on counts
      if (currentPhase.startsWith('CORNER')) {
        if (count === 3) {
          response.assistantText = "Good start. Keep rotating.";
          response.shouldSpeak = true;
        } else if (count === MIN_PHOTOS_PER_CORNER) {
          response.assistantText = "Minimum coverage met. You can continue or move to the next corner.";
          response.shouldSpeak = true;
        } else if (count === TARGET_PHOTOS_PER_CORNER_MIN + 5) {
          response.assistantText = "That's plenty for this corner. Let's move on.";
          response.shouldSpeak = true;
        }
      } else if (currentPhase === 'PERIMETER') {
        if (count % 10 === 0) {
          response.assistantText = `${count} photos in this section. Maintain your distance from the wall.`;
          response.shouldSpeak = true;
        }
      }
    }

    return response;
  }
};
