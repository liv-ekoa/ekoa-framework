// Prints public.moderation_hit() from src/lib/moderation.ts. Put the output in a new migration
// whenever the word lists change, so the database and the app always agree.
import { moderationSql } from '../src/lib/moderation';
console.log(moderationSql());
