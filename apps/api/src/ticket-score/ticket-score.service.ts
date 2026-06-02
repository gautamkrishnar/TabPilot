import * as fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { TicketScore } from '@tabpilot/shared';
import type { Model } from 'mongoose';
import { TicketScoreDoc } from './ticket-score.schema';

const SCORING_PROMPT = `You are a Jira ticket quality assessor for engineering grooming sessions.
Score this ticket on six dimensions from 0 to 100.

Dimensions:
1. Clarity — Is the ticket easy to understand? Are requirements unambiguous?
2. Completeness — Does it contain all necessary information? (description, acceptance criteria, dependencies, edge cases)
3. Actionability — Can a developer start working immediately without asking follow-up questions?
4. Testability — Are success criteria defined and verifiable? Can QA write test cases from this?
5. Formatting — Is the content well-structured? (proper sections, bullet points, code blocks, headings)
6. Context — Is there enough background? (why this change, business context, user impact, related tickets)

Scoring guide:
- 90-100: Exemplary — meets all criteria with rich detail
- 70-89: Good — meets most criteria, minor gaps
- 40-69: Needs work — significant gaps in this dimension
- 0-39: Poor — dimension is largely unaddressed

Return ONLY valid JSON (no markdown fencing):
{"overall":<number>,"dimensions":{"clarity":{"score":<number>,"feedback":"<1 sentence>"},"completeness":{"score":<number>,"feedback":"<1 sentence>"},"actionability":{"score":<number>,"feedback":"<1 sentence>"},"testability":{"score":<number>,"feedback":"<1 sentence>"},"formatting":{"score":<number>,"feedback":"<1 sentence>"},"context":{"score":<number>,"feedback":"<1 sentence>"}}}

The overall score is the average of all six dimension scores, rounded to the nearest integer.`;

@Injectable()
export class TicketScoreService {
  private readonly logger = new Logger(TicketScoreService.name);
  private client: GoogleGenAI | null = null;

  constructor(
    @InjectModel(TicketScoreDoc.name) private readonly scoreModel: Model<TicketScoreDoc>,
  ) {}

  private get credentialsPath(): string | undefined {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  private get location(): string {
    return process.env.VERTEX_AI_LOCATION ?? 'us-central1';
  }

  private get model(): string {
    return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  }

  get isConfigured(): boolean {
    const path = this.credentialsPath;
    return !!path && fs.existsSync(path);
  }

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const keyFile = this.credentialsPath;
    if (!keyFile) {
      throw new ServiceUnavailableException(
        'Ticket scoring not configured. Set GOOGLE_APPLICATION_CREDENTIALS.',
      );
    }

    const raw = fs.readFileSync(keyFile, 'utf-8');
    const sa = JSON.parse(raw) as { project_id?: string };
    const project = sa.project_id;
    if (!project) {
      throw new ServiceUnavailableException(
        'Service account JSON does not contain a project_id field.',
      );
    }

    this.client = new GoogleGenAI({
      vertexai: true,
      project,
      location: this.location,
      googleAuthOptions: { keyFile },
    });
    return this.client;
  }

  private toTicketScore(doc: TicketScoreDoc): TicketScore {
    return { overall: doc.overall, dimensions: doc.dimensions };
  }

  async getCached(key: string): Promise<TicketScore | null> {
    const doc = await this.scoreModel.findOne({ issueKey: key.toUpperCase() }).lean().exec();
    return doc ? this.toTicketScore(doc) : null;
  }

  async clearCache(key: string): Promise<void> {
    await this.scoreModel.deleteOne({ issueKey: key.toUpperCase() }).exec();
  }

  async scoreTicket(key: string, summary: string, description: string): Promise<TicketScore> {
    const issueKey = key.toUpperCase();

    const cached = await this.scoreModel.findOne({ issueKey }).lean().exec();
    if (cached) return this.toTicketScore(cached);

    const ai = this.getClient();

    const ticketContent = `## Ticket Summary\n${summary}\n\n## Ticket Description\n${description || '(no description provided)'}`;

    let response: { text?: string | null };
    try {
      response = await ai.models.generateContent({
        model: this.model,
        contents: `${SCORING_PROMPT}\n\n---\n\n${ticketContent}`,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
    } catch (err) {
      this.logger.error(`Gemini API call failed: ${err}`);
      throw new ServiceUnavailableException('Failed to score ticket via Gemini.');
    }

    let text = response.text?.trim();
    if (!text) {
      throw new ServiceUnavailableException('Gemini returned an empty response.');
    }

    if (text.startsWith('```')) {
      const start = text.indexOf('\n');
      const end = text.lastIndexOf('```');
      if (start !== -1 && end > start) text = text.slice(start + 1, end).trim();
    }

    try {
      const parsed = JSON.parse(text) as TicketScore;
      if (typeof parsed.overall !== 'number' || !parsed.dimensions) {
        throw new Error('Missing required fields');
      }

      await this.scoreModel.create({
        issueKey,
        overall: parsed.overall,
        dimensions: parsed.dimensions,
        scoredAt: new Date(),
      });

      return parsed;
    } catch {
      this.logger.error(`Failed to parse Gemini response: ${text}`);
      throw new ServiceUnavailableException('Gemini returned an unparseable response.');
    }
  }
}
