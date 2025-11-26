import { GoogleGenAI } from "@google/genai";
import { AnimalType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const COMMENTATOR_SYSTEM_INSTRUCTION = `
You are "Chirpy", an energetic and slightly dramatic sports commentator for the "Footaminal" league (animals playing soccer).
Keep your commentary extremely short, punchy, and exciting. Maximum 1-2 sentences.
Focus on the specific animal and the action. Use soccer terminology but keep it fun.
`;

export const generateGoalCommentary = async (animal: AnimalType, team: string, scoreRed: number, scoreBlue: number): Promise<string> => {
  try {
    const prompt = `
      GOAL SCORED!
      Scorer: ${animal} (${team} team).
      New Score: Red ${scoreRed} - Blue ${scoreBlue}.
      Give a hype reaction.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: COMMENTATOR_SYSTEM_INSTRUCTION,
        maxOutputTokens: 60,
      }
    });

    return response.text || "What a goal!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `GOAL by ${animal}! Incredible!`;
  }
};

export const generateMatchSummary = async (winner: string | 'Draw', redAnimal: AnimalType, blueAnimal: AnimalType, scoreRed: number, scoreBlue: number): Promise<string> => {
  try {
    const prompt = `
      Match Ended.
      Result: ${winner === 'Draw' ? 'Draw' : winner + ' wins'}.
      Score: Red ${scoreRed} - Blue ${scoreBlue}.
      Red Player: ${redAnimal}.
      Blue Player: ${blueAnimal}.
      Give a brief post-match summary.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: COMMENTATOR_SYSTEM_INSTRUCTION,
        maxOutputTokens: 100,
      }
    });

    return response.text || "What a match!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The match has ended! What a performance.";
  }
};
