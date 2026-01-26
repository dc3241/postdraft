import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 1000
) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const textContent = message.content.find((block) => block.type === "text")
    return textContent?.type === "text" ? textContent.text : ""
  } catch (error) {
    console.error("Claude API error:", error)
    throw new Error("Failed to generate content with Claude")
  }
}

export { anthropic }

