import { z } from 'genkit';
import { ai } from '../genkit';

// Input schema for article structuring
export const StructureArticleInputSchema = z.object({
  rawText: z.string().describe('The raw article text content'),
  headlines: z.array(z.string()).optional().describe('Headlines or section titles'),
  imageUrls: z.array(z.string()).optional().describe('URLs of images to include in the article'),
  imageDescriptions: z.array(z.string()).optional().describe('Descriptions or captions for each image'),
});

// Output schema for structured article sections
export const StructureArticleOutputSchema = z.object({
  sections: z.array(
    z.object({
      type: z.enum(['text', 'image', 'text-image']).describe('Type of section'),
      content: z.string().optional().describe('Text content for the section'),
      imageUrl: z.string().optional().describe('Image URL if section includes an image'),
      imagePosition: z.enum(['above', 'below', 'left', 'right']).optional().describe('Position of image relative to text (for text-image sections)'),
      caption: z.string().optional().describe('Image caption'),
      order: z.number().describe('Order of section in the article'),
    })
  ).describe('Structured article sections'),
});

export type StructureArticleInput = z.infer<typeof StructureArticleInputSchema>;
export type StructureArticleOutput = z.infer<typeof StructureArticleOutputSchema>;

// Define the prompt for article structuring
const structureArticlePrompt = ai.definePrompt({
  name: 'structureArticlePrompt',
  input: { schema: StructureArticleInputSchema },
  output: { schema: StructureArticleOutputSchema },
  prompt: `You are an expert article editor and content strategist. Your task is to structure a raw article into well-organized sections with appropriate text and image placement.

Given:
- Raw article text: {{{rawText}}}
- Headlines (if provided): {{{headlines}}}
- Image URLs (if provided): {{{imageUrls}}}
- Image descriptions (if provided): {{{imageDescriptions}}}

Create a structured article with sections that:
1. Break the text into logical paragraphs/sections
2. Integrate images naturally where they enhance the content
3. Use appropriate image positioning (above, below, left, or right of text)
4. Generate meaningful captions for images based on context
5. Maintain a good reading flow and visual balance

Guidelines:
- Use 'text' sections for paragraphs without images
- Use 'image' sections for standalone images with captions
- Use 'text-image' sections when text and image should appear together
- For 'text-image' sections, choose positioning that makes sense:
  * 'above' - image introduces the text
  * 'below' - image illustrates or concludes the text
  * 'left' or 'right' - image complements text side-by-side (for desktop)
- Ensure sections are ordered logically (order: 0, 1, 2, ...)
- If headlines are provided, use them to identify section breaks
- Match images to relevant text sections based on context and descriptions
- Generate captions that are informative and engaging

Return a structured array of sections that creates a professional, well-formatted article.`,
});

// Define the flow
export const structureArticleFlow = ai.defineFlow(
  {
    name: 'structureArticleFlow',
    inputSchema: StructureArticleInputSchema,
    outputSchema: StructureArticleOutputSchema,
  },
  async (input) => {
    const { output } = await structureArticlePrompt(input);
    return output!;
  }
);

// Export function for use in API routes
export async function structureArticle(input: StructureArticleInput): Promise<StructureArticleOutput> {
  return structureArticleFlow(input);
}

