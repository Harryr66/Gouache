import { z } from 'genkit';
import { ai } from '../genkit';

// Input schema for docuseries article generation
export const GenerateDocuseriesInputSchema = z.object({
  artistName: z.string().describe('The name of the artist'),
  website: z.string().optional().describe('Artist website URL'),
  socialLinks: z.array(z.string()).optional().describe('Social media and other relevant links'),
  scrapedContent: z.array(
    z.object({
      url: z.string(),
      title: z.string().optional(),
      text: z.string(),
    })
  ).optional().describe('Scraped content from provided URLs'),
  contextImages: z.array(z.string()).optional().describe('Image URLs for context'),
  additionalNotes: z.string().optional().describe('Any additional notes or context about the artist'),
});

// Output schema for generated docuseries article
export const GenerateDocuseriesOutputSchema = z.object({
  title: z.string().describe('Article title'),
  summary: z.string().describe('Article summary/standfirst (2-3 sentences)'),
  sections: z.array(
    z.object({
      type: z.enum(['text', 'image', 'text-image']),
      content: z.string().optional(),
      imageUrl: z.string().optional(),
      imagePosition: z.enum(['above', 'below', 'left', 'right']).optional(),
      caption: z.string().optional(),
      order: z.number(),
    })
  ).describe('Structured article sections'),
  tags: z.array(z.string()).describe('Relevant tags for the article'),
  researchNotes: z.string().optional().describe('Notes about the research process and sources'),
});

export type GenerateDocuseriesInput = z.infer<typeof GenerateDocuseriesInputSchema>;
export type GenerateDocuseriesOutput = z.infer<typeof GenerateDocuseriesOutputSchema>;

// Define the prompt for docuseries generation
const generateDocuseriesPrompt = ai.definePrompt({
  name: 'generateDocuseriesPrompt',
  input: { schema: GenerateDocuseriesInputSchema },
  output: { schema: GenerateDocuseriesOutputSchema },
  prompt: `You are an expert art journalist and biographer specializing in creating compelling docuseries-style articles about artists' lives and careers.

Your task is to research and write a comprehensive, engaging docuseries article about an artist based on the provided information.

Artist Information:
- Name: {{{artistName}}}
- Website: {{{website}}}
- Social Links: {{{socialLinks}}}
- Additional Notes: {{{additionalNotes}}}

Research Content:
{{{scrapedContent}}}

Context Images: {{{contextImages}}}

Instructions:
1. **Research Synthesis**: Analyze all provided information from websites, social media, and notes to create a comprehensive understanding of the artist's:
   - Background and early life
   - Artistic journey and evolution
   - Major works and achievements
   - Artistic style and influences
   - Current work and future direction
   - Personal philosophy and artistic vision

2. **Article Structure**: Create a well-structured docuseries article with:
   - A compelling title that captures the essence of the artist
   - A 2-3 sentence summary/standfirst that hooks the reader
   - Multiple sections that tell the artist's story chronologically and thematically
   - Mix of text-only sections and text-image sections
   - Strategic placement of images to enhance the narrative

3. **Writing Style**:
   - Write in a journalistic, narrative style suitable for a docuseries
   - Be engaging and storytelling-focused
   - Include specific details, dates, and facts when available
   - Maintain objectivity while being compelling
   - Use vivid descriptions of artworks and artistic processes
   - Include quotes or paraphrased statements when appropriate

4. **Section Guidelines**:
   - Break the story into logical sections (e.g., "Early Years", "Artistic Breakthrough", "Current Work")
   - Use 'text' sections for narrative paragraphs
   - Use 'text-image' sections when images enhance the story
   - Position images 'above' to introduce a section, 'below' to conclude, or 'left'/'right' for side-by-side layout
   - Generate meaningful captions that add context to images

5. **Tags**: Generate 5-10 relevant tags including:
   - Artist name variations
   - Art styles/movements
   - Mediums used
   - Themes/subjects
   - Geographic location if relevant

6. **Research Notes**: Document key sources and any gaps in information that should be noted

Create a professional, publication-ready docuseries article that tells the artist's story in an engaging and informative way.`,
});

// Define the flow
export const generateDocuseriesFlow = ai.defineFlow(
  {
    name: 'generateDocuseriesFlow',
    inputSchema: GenerateDocuseriesInputSchema,
    outputSchema: GenerateDocuseriesOutputSchema,
  },
  async (input) => {
    const { output } = await generateDocuseriesPrompt(input);
    return output!;
  }
);

// Export function for use in API routes
export async function generateDocuseries(input: GenerateDocuseriesInput): Promise<GenerateDocuseriesOutput> {
  return generateDocuseriesFlow(input);
}

