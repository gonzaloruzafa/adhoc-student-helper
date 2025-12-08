export interface InfogramResult {
  handDrawnSketch: {
    imageUrl: string;
    imageData: string;
    description: string;
  };
  title: string;
  summary: string;
  mainConcepts: Array<{
    concept: string;
    explanation: string;
    example?: string;
  }>;
  visualElements: {
    diagram?: string;
    keyPoints: string[];
    connections: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  };
  studyTips: string[];
  keyQuestions: Array<{
    question: string;
    answer: string;
  }>;
  difficulty: "Básico" | "Intermedio" | "Avanzado";
}
