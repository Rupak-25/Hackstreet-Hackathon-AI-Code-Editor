const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

export async function streamGeminiCodeReview({ file, question, mode, onChunk }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in .env');
  }

  const prompt = buildPrompt(file, question, mode);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini request failed with status ${response.status}: ${details}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const jsonText = trimmed.replace(/^data:\s*/, '');
      if (!jsonText || jsonText === '[DONE]') continue;

      try {
        const data = JSON.parse(jsonText);
        const chunk = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (chunk) {
          fullText += chunk;
          onChunk?.(chunk, fullText);
        }
      } catch {
        // Ignore partial SSE lines.
      }
    }
  }

  return fullText || 'Gemini returned no text.';
}

function buildPrompt(file, question, mode) {
  return `
You are an expert AI coding assistant inside a frontend-only code editor.

Assistant mode: ${mode}
File name: ${file.name}
Language: ${file.language}

User question:
${question}

Current file code:
\`\`\`${file.language}
${file.content}
\`\`\`

Answer like a professional ChatGPT-style coding assistant.

Format your answer in clean Markdown:
- Use short headings.
- Use bullet points and numbered steps.
- Use code blocks when showing code.
- Use tables only when they improve clarity.
- Avoid huge paragraphs.
- Keep the explanation beginner-friendly and practical.

Include:
1. What mistakes, bugs, or risks are in the code
2. Why they happen
3. How to fix them step by step
4. Desired output or expected behavior
5. Improved code only when useful
`;
}
