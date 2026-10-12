/**
 * Loads every JSON file in src/content and validates it against its zod schema.
 * Any invalid file stops the build (and the dev page) with a field-level message —
 * content never silently renders empty.
 */
import { contentSchemas, fieldErrors, type Content, type ContentName } from '../content/schemas';
import settings from '../content/settings.json';
import ui from '../content/ui.json';
import hero from '../content/hero.json';
import mission from '../content/mission.json';
import services from '../content/services.json';
import projects from '../content/projects.json';
import experience from '../content/experience.json';
import recommendations from '../content/recommendations.json';
import people from '../content/people.json';
import contact from '../content/contact.json';

const raw: Record<ContentName, unknown> = {
  settings,
  ui,
  hero,
  mission,
  services,
  projects,
  experience,
  recommendations,
  people,
  contact,
};

function load(): Content {
  const out: Partial<Content> = {};
  const problems: string[] = [];
  for (const name of Object.keys(contentSchemas) as ContentName[]) {
    const result = contentSchemas[name].safeParse(raw[name]);
    if (result.success) {
      (out as Record<string, unknown>)[name] = result.data;
    } else {
      for (const [path, messages] of Object.entries(fieldErrors(result.error))) {
        problems.push(`  src/content/${name}.json → ${path}: ${messages.join('; ')}`);
      }
    }
  }
  if (problems.length) {
    throw new Error(`Invalid content:\n${problems.join('\n')}`);
  }
  return out as Content;
}

export const content: Content = load();
